**SQL 查询模块详细 PRD**

**1. 产品定位**

SQL 查询模块用于让用户在私有化数据分析平台内，通过 SQL 语句直接查询有权限的数据源，获得查询结果，并基于结果完成下载、可视化分析、保存图表和例行查询。

该模块不是“执行一个 SQL”的单点能力，而是一个完整工作流：

选择数据连接 / 数据库 / 数据表

→ 编写 SQL

→ 解析 SQL

→ 执行 SQL

→ 查看结果 / 日志 / 历史

→ 下载结果

→ 保存至可视化查询

→ 保存图表

→ 配置 SQL 例行

SQL 查询模块需要支持以下核心对象：

文件夹

工作簿 / 查询文件

临时查询

数据源连接

库表元数据

SQL 编辑器

自定义变量

查询任务

查询历史

查询结果

下载任务

临时数据集

可视化图表

SQL 例行任务

本 PRD 按产品功能逻辑级定义，所有交互、校验、接口、状态、异常均需要可直接进入开发实现。

**2. 功能边界**

**2.1 本期支持范围**

SQL 查询模块支持：

1. SQL 查询工作台页面。
2. 左侧工作栏：工作簿、查询历史、库表查询。
3. 文件夹管理工作簿。
4. 临时 SQL 查询保存为工作簿。
5. 支持选择执行数据连接。
6. 支持数据源类型：
   * MYSQL
   * DORIS
   * DATA\_LAKE\_API
   * HIVE\_JDBC
7. 支持选择或检索数据库。
8. 支持查看有权限库表。
9. 支持无权限表置灰。
10. 支持悬停表名查看字段、数据预览、分区信息、表信息。
11. 支持插入表名到 SQL 编辑器。
12. 支持插入查询语句模板到 SQL 编辑器。
13. 支持 SQL 编辑、格式化、解析、运行。
14. 支持快捷键：

* 运行：Shift + Enter
* 格式化：Mac Option + Shift + F，Windows Alt + Shift + F
* 解析：Mac Command + Shift + P，Windows Ctrl + Shift + P
* 保存：Mac Command + S，Windows Ctrl + S

1. 支持函数联想，按 Enter 输入首条联想内容。
2. 支持自定义变量。
3. 支持变量类型：

* Text
* Dropdown List
* Date
* Date and Time
* Date and Time with seconds

1. 支持单一 SQL 语句执行。
2. 支持查询期间关闭页面，查询完成后仍可查看结果。
3. 支持查询历史记录。
4. 支持历史 SQL 一键复制。
5. 支持查询结果分页预览。
6. 支持结果单列排序。
7. 支持结果单列值搜索。
8. 支持下载查询结果。
9. 支持下载编码：

* UTF-8
* GBK

1. 下载文件格式为 CSV。
2. 支持查询结果保存至可视化查询。
3. 支持 SQL 查询结果生成临时数据集。
4. 保存图表后临时数据集转为正式数据集。
5. 支持已保存 SQL 查询图表配置 SQL 例行。
6. 支持 SQL 例行数据更新、执行记录、失败提示。

**2.2 本期不支持范围**

1. 不支持在同一个 SQL 编辑框内一次执行多个 SQL 语句。
2. 不支持 DDL、DML、存储过程、数据库管理语句执行。
3. 不支持跨数据源 SQL 联邦查询。
4. 不支持多人实时协同编辑同一工作簿。
5. 不支持 SQL 结果直接编辑数据。
6. 不支持未保存图表配置 SQL 例行。
7. 不支持 SQL 查询结果永久保留为临时结果，临时结果需要按清理策略过期。
8. 不支持 Map、Array 类型在 SQL 例行中作为原生复杂类型参与可视化计算，统一按 String 处理。

**3. 权限与开关**

**3.1 模块开关**

SQL 查询为增值模块，系统需要支持租户级、项目级功能开关。

interface SqlQueryFeatureSwitch {

tenantId: string;

enabled: boolean;

minVersion: string;

allowedProjectIds?: string[];

}

展示逻辑：

| **条件** | **页面表现** |
| --- | --- |
| enabled = true 且当前项目在允许范围内 | 展示 SQL 查询入口 |
| enabled = false | 不展示入口 |
| 用户通过 URL 强行访问 | 返回 403，并展示“当前项目未开通 SQL 查询模块” |
| 数据源类型不支持 | 不在 SQL 查询数据源列表展示 |

**3.2 权限点**

type SqlQueryPermission =

| "sql\_query:view"

| "sql\_query:create\_workbook"

| "sql\_query:edit\_workbook"

| "sql\_query:delete\_workbook"

| "sql\_query:execute"

| "sql\_query:download"

| "sql\_query:create\_visual\_chart"

| "sql\_query:create\_routine"

| "sql\_query:view\_history"

| "sql\_query:manage\_folder";

**3.3 权限校验逻辑**

进入 SQL 查询页面时，前端请求：

GET /api/sql-query/permissions/current?projectId={projectId}

返回：

{

"canView": true,

"canCreateWorkbook": true,

"canEditWorkbook": true,

"canDeleteWorkbook": true,

"canExecute": true,

"canDownload": true,

"canCreateVisualChart": true,

"canCreateRoutine": true,

"canViewHistory": true,

"canManageFolder": true

}

前端控制：

| **页面元素** | **展示条件** |
| --- | --- |
| SQL 查询入口 | canView = true |
| 新建文件夹 | canManageFolder = true |
| 新建查询文件 | canCreateWorkbook = true |
| 保存按钮 | canCreateWorkbook 或 canEditWorkbook |
| 运行按钮 | canExecute = true |
| 解析按钮 | canExecute = true |
| 下载按钮 | canDownload = true 且查询成功 |
| 新建图表按钮 | canCreateVisualChart = true 且查询成功 |
| 例行按钮 | canCreateRoutine = true 且图表已保存 |
| 删除工作簿 | canDeleteWorkbook = true 或当前用户为 owner |

后端必须在每个接口再次校验权限，前端隐藏按钮不能作为安全依据。

**3.4 数据源权限**

用户查看、预览、执行 SQL 时，需要拥有对应数据源、数据库、表的读取权限。

无权限处理：

1. 库表树中无权限表置灰。
2. 置灰表不可点击“插入表名”。
3. 悬停无权限表时只展示表名，不展示字段、预览、分区。
4. 如果用户手动输入无权限表 SQL 并执行，后端返回权限错误。
5. 查询历史中如果包含当前用户已失去权限的数据源，仍可查看 SQL 快照，但不可重新执行。

**4. 页面信息架构**

**4.1 页面入口**

可视化分析 / SQL 查询

**4.2 SQL 查询工作台布局**

┌────────────────────────────────────────────────────┐

│ 顶部：项目选择 / 页面标题 / 帮助 / 用户信息 │

├───────────────┬────────────────────────────────────┤

│ 左侧工作栏 │ 右侧主工作区 │

│ │ ┌────────────────────────────────┐ │

│ 工作簿 │ │ 查询 Tab / 工作簿名 / 保存状态 │ │

│ 查询历史 │ ├────────────────────────────────┤ │

│ 库表查询 │ │ SQL 编辑区 │ │

│ │ │ 数据源选择 / 数据库 / 资源 / 工具栏 │ │

│ │ ├────────────────────────────────┤ │

│ │ │ 自定义变量输入区 │ │

│ │ ├────────────────────────────────┤ │

│ │ │ 查询结果区 │ │

│ │ │ 当前工作簿历史 / 结果 / 日志 │ │

│ │ └────────────────────────────────┘ │

└───────────────┴────────────────────────────────────┘

**4.3 工作区区域定义**

| **区域** | **功能** |
| --- | --- |
| 左侧工作栏 | 切换工作簿、查询历史、库表查询 |
| 查询 Tab 区 | 打开多个查询框，每个查询框独立保存 SQL 内容和运行状态 |
| 编辑器工具栏 | 保存、解析、运行、格式化、下载、新建图表 |
| 数据连接选择区 | 选择 SQL 执行使用的数据源连接 |
| SQL 编辑器 | 编写 SQL、函数联想、插入表名、快捷键 |
| 变量说明区 | 自动展示 SQL 中识别出的自定义变量输入项 |
| 查询结果区 | 展示查询历史、查询结果、查询日志 |

**5. 核心数据模型**

**5.1 SQL 文件夹**

interface SqlFolder {

id: string;

projectId: string;

parentId: string | null;

name: string;

sortIndex: number;

createdBy: string;

createdAt: string;

updatedBy: string;

updatedAt: string;

deletedAt?: string;

}

文件夹规则：

1. 同一父级目录下文件夹名称不能重复。
2. 文件夹名称长度为 1 到 64 个字符。
3. 文件夹名称不允许包含：

/ \ : \* ? " < > |

1. 删除文件夹时，如果存在子文件夹或工作簿，需要二次确认。
2. 删除文件夹默认软删除，文件夹下工作簿一起进入回收状态。
3. 根目录不可删除、不可重命名。

**5.2 SQL 工作簿 / 查询文件**

interface SqlWorkbook {

id: string;

projectId: string;

folderId: string | null;

name: string;

description?: string;

sqlContent: string;

dataSourceType?: SqlDataSourceType;

connectionId?: string;

databaseName?: string;

resourceId?: string;

variableConfigs: SqlVariableConfig[];

ownerId: string;

ownerName: string;

status: "saved" | "deleted";

createdBy: string;

createdAt: string;

updatedBy: string;

updatedAt: string;

lastExecutedAt?: string;

}

**5.3 临时查询**

用户无需创建工作簿即可直接编辑 SQL。

interface TemporarySqlQuery {

id: string;

projectId: string;

title: string;

sqlContent: string;

dataSourceType?: SqlDataSourceType;

connectionId?: string;

databaseName?: string;

resourceId?: string;

variableConfigs: SqlVariableConfig[];

variableValues: Record<string, string>;

createdAt: string;

updatedAt: string;

localDraftKey: string;

}

临时查询规则：

1. 默认标题为：

临时查询-{yyyyMMdd-HHmmss}

1. 临时查询不出现在工作簿树中。
2. 点击保存后，弹出“保存查询”弹窗，选择文件夹并输入名称。
3. 保存成功后，临时查询转为正式工作簿。
4. 浏览器刷新时，未保存临时查询通过本地草稿恢复。
5. 本地草稿仅保存当前用户、当前项目、当前浏览器内的数据。

**5.4 数据源类型**

type SqlDataSourceType =

| "MYSQL"

| "DORIS"

| "DATA\_LAKE\_API"

| "HIVE\_JDBC";

**5.5 查询任务**

interface SqlQueryJob {

id: string;

projectId: string;

workbookId?: string;

temporaryQueryId?: string;

dataSourceType: SqlDataSourceType;

connectionId: string;

databaseName: string;

resourceId?: string;

rawSql: string;

compiledSql: string;

sqlHash: string;

variableValueSnapshot: Record<string, string>;

status:

| "created"

| "parsing"

| "waiting"

| "running"

| "success"

| "failed"

| "cancelled"

| "timeout";

resultRowCount?: number;

resultColumnCount?: number;

resultStorageId?: string;

errorCode?: string;

errorMessage?: string;

startedAt?: string;

finishedAt?: string;

durationMs?: number;

createdBy: string;

createdAt: string;

}

**5.6 查询结果字段**

interface SqlResultColumn {

name: string;

type: string;

displayType:

| "string"

| "number"

| "boolean"

| "date"

| "datetime"

| "array\_as\_string"

| "map\_as\_string"

| "unknown";

nullable: boolean;

index: number;

}

**5.7 查询历史**

interface SqlQueryHistory {

id: string;

projectId: string;

workbookId?: string;

jobId: string;

sqlSnapshot: string;

dataSourceType: SqlDataSourceType;

connectionId: string;

connectionName: string;

databaseName: string;

status: SqlQueryJob["status"];

resultRowCount?: number;

errorMessage?: string;

executedBy: string;

executedAt: string;

durationMs?: number;

}

**5.8 自定义变量**

type SqlVariableType =

| "text"

| "dropdown"

| "date"

| "datetime\_minute"

| "datetime\_second";

interface SqlVariableConfig {

name: string;

type: SqlVariableType;

required: boolean;

defaultValue?: string;

options?: string[];

dateFormat?: string;

createdFromSql: boolean;

updatedAt: string;

}

**5.9 下载任务**

interface SqlResultDownloadTask {

id: string;

jobId: string;

projectId: string;

encoding: "UTF-8" | "GBK";

fileFormat: "CSV";

status: "created" | "running" | "success" | "failed" | "expired";

fileName: string;

fileSizeBytes?: number;

downloadUrl?: string;

errorMessage?: string;

createdBy: string;

createdAt: string;

expiredAt: string;

}

**5.10 SQL 例行任务**

interface SqlRoutineTask {

id: string;

projectId: string;

chartId: string;

datasetId: string;

sourceSqlJobId: string;

sqlSnapshot: string;

connectionId: string;

databaseName: string;

syncType: "full\_overwrite" | "partition\_overwrite";

scheduleType: "daily" | "weekly" | "monthly" | "cron";

scheduleCron?: string;

scheduleStartAt: string;

enabled: boolean;

maxResultSizeBytes: number;

status: "enabled" | "paused" | "deleted";

createdBy: string;

createdAt: string;

updatedAt: string;

}

**6. 左侧工作栏 PRD**

**6.1 工作栏结构**

左侧工作栏包含三个一级入口：

工作簿

查询历史

库表查询

每个入口为互斥 Tab，点击后左侧内容区切换。

**6.2 工作簿入口**

**6.2.1 展示结构**

工作簿

├── 搜索框

├── 新建文件夹按钮

├── 新建查询按钮

└── 文件夹树

├── 文件夹 A

│ ├── 查询文件 1

│ └── 查询文件 2

└── 文件夹 B

**6.2.2 搜索逻辑**

搜索框 placeholder：

搜索文件夹 / 查询文件

规则：

1. 输入后 300ms debounce。
2. 搜索范围为当前项目下未删除文件夹和工作簿。
3. 文件夹名称、工作簿名称均支持模糊匹配。
4. 搜索结果仍按树结构展示。
5. 如果工作簿命中但父文件夹未命中，父文件夹仍展示，用于保留层级。
6. 搜索为空时恢复完整树。

**6.2.3 新建文件夹**

点击“新建文件夹”后，在当前选中文件夹下创建；如果未选中文件夹，则创建在根目录下。

表单字段：

| **字段** | **类型** | **必填** | **校验** |
| --- | --- | --- | --- |
| 文件夹名称 | input | 是 | 1-64 字符，同级不可重复 |

提交接口：

POST /api/sql-query/folders

请求体：

{

"projectId": "project\_001",

"parentId": null,

"name": "销售分析"

}

成功后：

1. 文件夹树新增节点。
2. 新文件夹进入选中状态。
3. Toast 显示“文件夹创建成功”。

失败场景：

| **场景** | **提示** |
| --- | --- |
| 同名 | 当前目录下已存在同名文件夹 |
| 无权限 | 无文件夹管理权限 |
| 名称非法 | 文件夹名称不能包含特殊字符 |

**6.2.4 文件夹右侧菜单**

文件夹 hover 时展示 ⋮ 菜单。

菜单项：

| **操作** | **条件** |
| --- | --- |
| 新建查询 | canCreateWorkbook |
| 新建文件夹 | canManageFolder |
| 重命名 | canManageFolder 且非根目录 |
| 删除 | canManageFolder 且非根目录 |

**重命名逻辑**

1. 点击重命名，文件夹名称进入编辑状态。
2. 输入新名称。
3. Enter 保存，Esc 取消。
4. 保存时校验同级唯一。
5. 保存成功刷新树节点名称。

接口：

PUT /api/sql-query/folders/{folderId}

**删除逻辑**

1. 点击删除。
2. 如果文件夹为空，展示确认文案：

确认删除该文件夹？

1. 如果文件夹下存在子文件夹或工作簿，展示确认文案：

该文件夹下包含查询文件或子文件夹，删除后其中内容将一并移除。确认删除？

1. 用户确认后调用：

DELETE /api/sql-query/folders/{folderId}

1. 后端软删除文件夹及其子资源。
2. 当前打开的工作簿如果被删除，编辑区展示“该查询文件已被删除”，并禁止保存、运行。

**6.3 查询文件逻辑**

**6.3.1 新建查询**

点击“新建查询”：

1. 主工作区新增一个查询 Tab。
2. 查询内容为空。
3. Tab 名称为：

临时查询

1. 默认选中上一次使用的数据源连接。
2. 如果没有历史数据源，数据源为空，需要用户选择。

**6.3.2 打开查询文件**

点击查询文件：

1. 如果当前 Tab 有未保存变更，弹窗提示：

当前查询尚未保存，切换后未保存内容可能丢失。是否保存？

按钮：

保存并切换 / 不保存 / 取消

1. 选择保存并切换：先保存当前工作簿，再打开目标工作簿。
2. 选择不保存：丢弃当前未保存变更，打开目标工作簿。
3. 选择取消：停留当前工作簿。

打开后：

1. 加载 SQL 内容。
2. 加载数据源连接、数据库、资源配置。
3. 解析 SQL 中自定义变量。
4. 加载变量配置。
5. 加载当前工作簿最近查询历史。
6. 编辑器光标定位到 SQL 内容末尾。

**6.3.3 查询文件右侧菜单**

查询文件 hover 时展示 ⋮。

菜单项：

| **操作** | **逻辑** |
| --- | --- |
| 重命名 | 修改工作簿名 |
| 复制 | 新建一份内容相同的工作簿 |
| 移动到 | 选择目标文件夹 |
| 删除 | 删除工作簿 |
| 复制 SQL | 将 SQL 内容复制到剪贴板 |

**复制工作簿**

复制命名规则：

{原名称}\_副本

如果已存在：

{原名称}\_副本\_2

{原名称}\_副本\_3

复制内容包括：

1. SQL 内容。
2. 数据源选择。
3. 数据库选择。
4. 资源选择。
5. 变量配置。

不复制：

1. 查询历史。
2. 查询结果。
3. 下载任务。
4. 可视化图表。
5. 例行任务。

**7. 库表查询 PRD**

**7.1 使用目标**

库表查询用于让用户在 SQL 编辑前浏览当前机房、当前项目下可用的数据源、数据库、数据表和字段结构，并快速插入表名或查询模板。

**7.2 展示结构**

库表查询

├── 数据源类型选择

├── 数据连接选择

├── 数据库搜索 / 选择

├── 表搜索

└── 表列表

├── table\_a

├── table\_b

└── table\_c

**7.3 数据源类型选择**

支持：

const supportedSourceTypes = [

"MYSQL",

"DORIS",

"DATA\_LAKE\_API",

"HIVE\_JDBC"

];

数据源类型切换逻辑：

1. 清空当前连接、数据库、表搜索结果。
2. 请求该类型下用户有权限的数据连接。
3. 如果没有连接，展示：

暂无可用数据连接

接口：

GET /api/sql-query/metadata/connections?projectId={projectId}&type=MYSQL

返回：

[

{

"id": "conn\_001",

"name": "mysql\_sales",

"type": "MYSQL",

"permission": "readable"

}

]

**7.4 数据库选择**

用户选择数据连接后，加载数据库列表。

接口：

GET /api/sql-query/metadata/databases?connectionId={connectionId}

规则：

1. 数据库列表支持搜索。
2. 搜索输入后 300ms debounce。
3. 搜索按数据库名称模糊匹配。
4. 用户选择数据库后，加载该数据库下的数据表。
5. 如果连接失败，展示连接错误。
6. 如果用户无连接权限，展示“无该数据连接访问权限”。

**7.5 表列表**

接口：

GET /api/sql-query/metadata/tables?connectionId={connectionId}&database={databaseName}&keyword={keyword}&page=1&pageSize=50

返回：

{

"items": [

{

"name": "orders",

"type": "table",

"hasPermission": true,

"isPartitioned": false

},

{

"name": "customer\_private",

"type": "table",

"hasPermission": false,

"isPartitioned": false

}

],

"total": 128

}

展示规则：

| **表权限** | **展示** |
| --- | --- |
| hasPermission = true | 正常黑色文字，可 hover、可插入 |
| hasPermission = false | 灰色文字，不可插入，hover 只展示无权限提示 |

**7.6 表名 hover 浮窗**

鼠标移动至有权限表名时，展示浮窗。

浮窗 Tab：

字段信息 | 数据预览 | 分区信息 | 表信息

**字段信息**

接口：

GET /api/sql-query/metadata/tables/{tableName}/columns?connectionId={connectionId}&database={databaseName}

字段：

| **字段** | **说明** |
| --- | --- |
| 字段名 | column name |
| 类型 | 数据源原生类型 |
| 是否可空 | nullable |
| 备注 | comment |

**数据预览**

接口：

GET /api/sql-query/metadata/tables/{tableName}/preview?connectionId={connectionId}&database={databaseName}&limit=20

规则：

1. 默认预览 20 行。
2. 预览超时时间 10 秒。
3. 预览失败时，只在浮窗内展示错误，不影响页面。
4. 无权限时不请求预览接口。

**分区信息**

展示字段：

| **字段** | **说明** |
| --- | --- |
| 分区字段 | partition column |
| 分区类型 | 数据源返回 |
| 最近分区 | 最近可用分区值 |

如果表非分区表，展示：

该表暂无分区信息

**表信息**

展示：

| **字段** | **说明** |
| --- | --- |
| 表名 | 完整表名 |
| 数据库 | database |
| 数据源 | connection name |
| 表类型 | table / view |
| 描述 | comment |

**7.7 插入表名**

用户点击“插入表名”：

1. 获取当前编辑器光标位置。
2. 根据数据源类型生成表名文本。
3. 插入到光标位置。
4. 插入后光标移动到表名末尾。
5. 编辑器进入 dirty 状态。

表名生成规则：

| **数据源** | **插入格式** |
| --- | --- |
| MYSQL | `database`.`table` |
| DORIS | `database`.`table` |
| HIVE\_JDBC | `database`.`table` |
| DATA\_LAKE\_API | database.table |

如果当前 SQL 为空，插入后不自动补全 SELECT；只插入表名。

**7.8 插入查询语句**

用户点击“插入查询语句”：

生成模板：

SELECT

column\_1,

column\_2

FROM database.table

LIMIT 100

规则：

1. 默认插入前 20 个字段。
2. 如果字段数超过 20，只取前 20 个字段。
3. 如果当前编辑器为空，直接填充。
4. 如果当前编辑器非空，在当前光标位置插入。
5. 插入模板后光标定位到 SELECT 字段列表末尾。
6. LIMIT 仅作为预览保护，用户可删除。

**8. SQL 编辑器 PRD**

**8.1 编辑器基础能力**

编辑器需要支持：

1. SQL 语法高亮。
2. 行号展示。
3. 当前行高亮。
4. 括号匹配。
5. 选中 SQL 片段。
6. 撤销 / 重做。
7. 查找 / 替换。
8. 函数联想。
9. 表名插入。
10. SQL 格式化。
11. SQL 解析。
12. SQL 运行。
13. 自定义变量识别。
14. 快捷键执行。

**8.2 编辑器状态**

interface SqlEditorState {

tabId: string;

workbookId?: string;

isTemporary: boolean;

title: string;

sqlContent: string;

selectedText?: string;

cursorLine: number;

cursorColumn: number;

dirty: boolean;

saving: boolean;

parsing: boolean;

running: boolean;

lastParseResult?: SqlParseResult;

currentJobId?: string;

}

**8.3 顶部配置项**

编辑器上方展示：

| **控件** | **类型** | **必填** | **说明** |
| --- | --- | --- | --- |
| 数据源类型 | select | 是 | MYSQL / DORIS / DATA\_LAKE\_API / HIVE\_JDBC |
| 数据连接 | select | 是 | 用户有权限连接 |
| 数据库 | select | 是 | 连接下数据库 |
| 资源 | select | 否 | 数据源需要执行资源时展示 |
| 保存 | button | 否 | 保存当前 SQL |
| 解析 | button | 否 | 解析当前 SQL |
| 运行 | button | 否 | 执行当前 SQL |
| 格式化 | button | 否 | 格式化 SQL |
| 下载 | dropdown | 查询成功后展示 | 下载 UTF-8 / GBK |
| 新建图表 | button | 查询成功后展示 | 保存至可视化查询 |

**8.4 工具栏拖动**

编辑器内工具栏支持拖动。

实现规则：

1. 工具栏初始位置为编辑器顶部左侧。
2. 用户按住工具栏拖拽区域移动。
3. 拖拽位置限制在编辑器容器内。
4. 保存当前用户当前工作簿的工具栏位置。
5. 切换工作簿时，优先恢复该工作簿工具栏位置。
6. 如果容器尺寸变化导致位置越界，自动吸附到右上角。

interface EditorToolbarPosition {

workbookId?: string;

userId: string;

x: number;

y: number;

}

**8.5 SQL 内容变更**

用户输入时：

1. 更新 sqlContent。
2. 标记 dirty = true。
3. 触发变量识别。
4. 清空旧解析结果状态。
5. 不自动执行 SQL。
6. 不自动保存正式工作簿。
7. 每 2 秒将内容保存至本地草稿，避免浏览器异常关闭丢失。

**8.6 SQL 格式化**

触发方式：

1. 点击“格式化”按钮。
2. 使用快捷键：
   * Mac：Option + Shift + F
   * Windows：Alt + Shift + F

格式化逻辑：

1. 根据当前数据源类型选择 SQL 方言。
2. 对完整 SQL 内容格式化。
3. 保留 SQL 中的自定义变量占位符。
4. 格式化失败时不修改原 SQL。
5. 格式化成功后标记 dirty。
6. 如果用户选中部分 SQL，仅格式化选中片段；未选中时格式化全部。

接口：

POST /api/sql-query/editor/format

请求：

{

"dataSourceType": "MYSQL",

"sql": "select \* from orders where dt='2026-05-24'"

}

返回：

{

"formattedSql": "SELECT\n \*\nFROM orders\nWHERE dt = '2026-05-24'"

}

**8.7 函数联想**

触发条件：

1. 用户输入字母、下划线、函数前缀。
2. 用户输入 . 时触发表字段联想。
3. 用户使用快捷键打开联想面板。

联想来源：

type SuggestionSource =

| "sql\_keyword"

| "sql\_function"

| "database"

| "table"

| "column";

联想排序：

1. 完全前缀匹配优先。
2. 当前 SQL 方言函数优先。
3. 历史使用频率高的优先。
4. 字母序兜底。

按 Enter：

1. 如果联想面板打开，插入当前高亮项。
2. 如果无高亮项，插入第一条。
3. 如果联想面板未打开，按正常编辑器换行逻辑处理。

函数联想示例：

[

{

"label": "COUNT",

"insertText": "COUNT(${1:column})",

"type": "sql\_function",

"description": "聚合计数函数"

}

]

**8.8 快捷键**

| **操作** | **Mac** | **Windows** | **逻辑** |
| --- | --- | --- | --- |
| 运行 | Shift + Enter | Shift + Enter | 执行当前查询框 SQL |
| 格式化 | Option + Shift + F | Alt + Shift + F | 格式化 SQL |
| 解析 | Command + Shift + P | Ctrl + Shift + P | 解析 SQL |
| 保存 | Command + S | Ctrl + S | 保存工作簿 |
| 查看快捷键 | 页面左下角按钮 | 页面左下角按钮 | 打开快捷键说明弹窗 |

快捷键处理规则：

1. 如果焦点在 SQL 编辑器内，快捷键生效。
2. 如果焦点在变量输入框内：
   * Shift + Enter 仍触发运行。
   * Command/Ctrl + S 仍触发保存。
   * 普通 Enter 按输入框默认行为。
3. 如果弹窗打开，快捷键只对弹窗内操作生效，不触发运行或保存。

**9. SQL 保存 PRD**

**9.1 保存临时查询**

临时查询点击保存时，打开“保存查询”弹窗。

字段：

| **字段** | **类型** | **必填** | **校验** |
| --- | --- | --- | --- |
| 查询名称 | input | 是 | 1-64 字符，同文件夹下不可重复 |
| 保存文件夹 | tree select | 是 | 默认当前选中文件夹 |
| 描述 | textarea | 否 | 0-500 字符 |

保存接口：

POST /api/sql-query/workbooks

请求：

{

"projectId": "project\_001",

"folderId": "folder\_001",

"name": "订单明细查询",

"description": "",

"sqlContent": "SELECT \* FROM orders LIMIT 100",

"dataSourceType": "MYSQL",

"connectionId": "conn\_001",

"databaseName": "sales",

"resourceId": null,

"variableConfigs": []

}

成功后：

1. 生成正式工作簿。
2. 临时查询 Tab 绑定 workbookId。
3. 左侧工作簿树新增文件。
4. 保存状态变为“已保存”。
5. 清理本地临时草稿。

**9.2 保存已有工作簿**

点击保存或快捷键保存：

1. 校验用户是否有编辑权限。
2. 校验名称是否仍合法。
3. 保存 SQL 内容、数据源选择、变量配置。
4. 不保存当前变量值，变量值只作为运行时输入。
5. 保存成功后 dirty = false。

接口：

PUT /api/sql-query/workbooks/{workbookId}

请求：

{

"sqlContent": "SELECT \* FROM orders WHERE product\_name = {{产品名称}}",

"dataSourceType": "MYSQL",

"connectionId": "conn\_001",

"databaseName": "sales",

"resourceId": null,

"variableConfigs": [

{

"name": "产品名称",

"type": "text",

"required": true,

"defaultValue": "",

"options": [],

"dateFormat": null,

"createdFromSql": true

}

]

}

**9.3 离开页面保护**

如果存在未保存变更：

1. 点击浏览器关闭、刷新、切换菜单时弹出确认。
2. 弹窗文案：

当前 SQL 尚未保存，离开后未保存内容可能丢失。确认离开？

1. 用户确认离开时，保留本地草稿。
2. 用户取消时停留当前页面。

**10. 自定义变量 PRD**

**10.1 变量识别规则**

SQL 中使用以下格式定义变量：

{{变量名}}

变量名规则：

1. 支持中文、英文、数字、下划线、中划线。
2. 长度 1 到 64 字符。
3. 变量名前后空格自动 trim。
4. 变量名不能为空。
5. 同名变量在 SQL 中出现多次，只生成一个输入框。
6. 变量大小写敏感。
7. 不识别嵌套变量。

识别正则：

const VARIABLE\_REGEX = /\{\{\s\*([\u4e00-\u9fa5A-Za-z0-9\_-]{1,64})\s\*\}\}/g;

示例：

SELECT \*

FROM orders

WHERE product\_name = '{{产品名称}}'

AND order\_date >= '{{开始日期}}'

识别结果：

[

{ "name": "产品名称" },

{ "name": "开始日期" }

]

**10.2 变量输入区展示**

当 SQL 中存在变量时，编辑器下方展示“变量说明”区域。

展示规则：

1. 按变量首次出现在 SQL 中的顺序排序。
2. 每个变量显示：
   * 变量名
   * 输入控件
   * 齿轮设置按钮
3. 变量删除后，对应输入项自动移除。
4. 变量新增后，自动新增输入项。
5. 如果变量已有配置，沿用配置。
6. 如果变量无配置，默认类型为 Text。

**10.3 变量设置弹窗**

点击变量输入框右侧齿轮按钮，打开变量设置弹窗。

字段：

| **字段** | **类型** | **必填** | **说明** |
| --- | --- | --- | --- |
| 变量名 | readonly | 是 | 来自 SQL 占位符 |
| 类型 | select | 是 | Text / Dropdown List / Date / Date and Time / Date and Time with seconds |
| 是否必填 | switch | 是 | 默认 true |
| 默认值 | input | 否 | 按类型校验 |
| 选项内容 | textarea | Dropdown 必填 | 每行一个选项 |
| 日期格式 | select | 日期类型必填 | 根据变量类型展示 |

保存逻辑：

1. 点击确定后更新 variableConfigs。
2. 如果当前输入值不符合新类型，清空当前输入值。
3. 关闭弹窗后，不立即执行 SQL。
4. 工作簿标记 dirty。

**10.4 Text 类型**

Text 类型为普通文本输入框。

重要规则：

1. SQL 运行时，系统不在输入内容前后自动添加单引号。
2. 用户如果需要字符串条件，必须在 SQL 中自行写引号。

正确示例：

SELECT \*

FROM orders

WHERE product\_name = '{{产品名称}}'

变量值：

手机

编译后：

SELECT \*

FROM orders

WHERE product\_name = '手机'

错误示例：

SELECT \*

FROM orders

WHERE product\_name = {{产品名称}}

变量值：

手机

编译后：

SELECT \*

FROM orders

WHERE product\_name = 手机

此时数据库会将 手机 识别为字段或非法标识符，执行可能失败。

**10.5 Dropdown List 类型**

Dropdown List 类型用于配置固定选项。

配置规则：

1. 选项内容通过 textarea 输入。
2. 每一行代表一个选项。
3. 空行自动忽略。
4. 前后空格自动 trim。
5. 至少需要 1 个有效选项。
6. 选项去重，重复项只保留第一项。
7. 下拉框仅允许选择配置中的选项，不允许自由输入。

示例配置：

手机

电脑

家电

服饰

变量值编译规则：

1. 与 Text 一样，不自动加引号。
2. 用户需要字符串时，在 SQL 中自行写引号。

**10.6 Date 类型**

Date 类型精确到年月日。

支持格式：

YYYY-MM-DD

YYYY/MM/DD

YYYYMMDD

配置项：

interface DateVariableConfig {

type: "date";

dateFormat: "YYYY-MM-DD" | "YYYY/MM/DD" | "YYYYMMDD";

}

输入控件：

1. 展示日期选择器。
2. 用户选择后，按配置格式生成变量值。
3. 不允许手动输入非法日期。
4. 清空后如果 required = true，运行时报错。

**10.7 Date and Time 类型**

Date and Time 精确到年月日时分。

支持格式：

YYYY-MM-DD HH:mm

YYYY/MM/DD HH:mm

输入控件：

1. 展示日期时间选择器。
2. 秒固定为 00，但不写入变量值。
3. 输出值按格式生成。

**10.8 Date and Time with seconds 类型**

Date and Time with seconds 精确到年月日时分秒。

支持格式：

YYYY-MM-DD HH:mm:ss

YYYY/MM/DD HH:mm:ss

输入控件：

1. 展示日期时间选择器。
2. 支持秒选择。
3. 输出值按格式生成。

**10.9 变量运行前校验**

点击解析或运行前，执行变量校验。

校验顺序：

1. 从当前 SQL 中重新识别变量。
2. 检查每个变量是否存在配置。
3. 检查 required 变量是否有值。
4. 检查 Dropdown 变量值是否在 options 中。
5. 检查 Date 变量值是否符合配置格式。
6. 检查 DateTime 变量值是否符合配置格式。
7. 检查变量占位符是否存在非法格式。

错误示例：

{

"valid": false,

"errors": [

{

"variableName": "开始日期",

"message": "变量「开始日期」不能为空"

}

]

}

前端表现：

1. 对应变量输入框红色描边。
2. 运行按钮不提交任务。
3. Toast 展示第一条错误。
4. 变量区域自动展开。

**10.10 SQL 编译逻辑**

变量替换在后端执行，前端只用于预览和校验。

编译函数：

function compileSql(rawSql: string, variableValues: Record<string, string>): string {

return rawSql.replace(VARIABLE\_REGEX, (\_, variableName) => {

const normalizedName = variableName.trim();

const value = variableValues[normalizedName];

if (value === undefined || value === null) {

throw new Error(`变量 ${normalizedName} 未赋值`);

}

return value;

});

}

编译注意事项：

1. 所有变量均原样替换。
2. 系统不自动加引号。
3. 系统不自动转义 SQL 字符。
4. 变量值快照需要记录到查询任务中。
5. 查询历史展示原 SQL，不默认展示编译后的 SQL。
6. 查询日志中可展示脱敏后的编译 SQL。

**11. SQL 解析 PRD**

**11.1 触发方式**

1. 点击“解析”按钮。
2. 使用快捷键：
   * Mac：Command + Shift + P
   * Windows：Ctrl + Shift + P
3. 点击“运行”前自动解析。

**11.2 解析前置校验**

解析前必须满足：

1. SQL 内容不为空。
2. 已选择数据源类型。
3. 已选择数据连接。
4. 已选择数据库。
5. 自定义变量校验通过。
6. 编译后 SQL 为单一语句。

**11.3 单一 SQL 语句校验**

系统仅支持单一 SQL 语句执行。

合法：

SELECT \* FROM orders;

合法：

WITH t AS (

SELECT \* FROM orders

)

SELECT \* FROM t

不合法：

SELECT \* FROM orders;

SELECT \* FROM users;

校验逻辑：

1. 删除注释。
2. 保留字符串中的分号。
3. 使用 SQL parser 按方言解析。
4. 忽略末尾空语句。
5. 非空语句数量必须等于 1。
6. 如果数量大于 1，返回错误：

当前仅支持执行单一 SQL 语句，如需执行多个查询，请在不同查询框中分别执行。

**11.4 允许语句类型**

SQL 查询模块默认只允许只读查询类语句。

允许：

SELECT

WITH ... SELECT

SHOW

DESCRIBE

DESC

EXPLAIN

不允许：

CREATE

DROP

ALTER

INSERT

UPDATE

DELETE

TRUNCATE

MERGE

CALL

GRANT

REVOKE

如果用户执行不允许语句，提示：

SQL 查询模块仅支持查询类语句，不支持执行数据变更或数据库管理语句。

**11.5 解析接口**

POST /api/sql-query/sql/parse

请求：

{

"projectId": "project\_001",

"dataSourceType": "MYSQL",

"connectionId": "conn\_001",

"databaseName": "sales",

"resourceId": null,

"rawSql": "SELECT \* FROM orders WHERE order\_date >= '{{开始日期}}'",

"variableValues": {

"开始日期": "2026-05-01"

}

}

返回成功：

{

"valid": true,

"compiledSql": "SELECT \* FROM orders WHERE order\_date >= '2026-05-01'",

"statementType": "SELECT",

"columns": [

{

"name": "order\_id",

"type": "bigint",

"nullable": false

}

],

"tables": [

{

"databaseName": "sales",

"tableName": "orders"

}

]

}

返回失败：

{

"valid": false,

"errors": [

{

"line": 3,

"column": 15,

"message": "SQL 语法错误：缺少 FROM 关键字"

}

]

}

**11.6 解析结果展示**

成功：

1. Toast 显示“解析成功”。
2. 编辑器状态栏显示：
   * 语句类型
   * 涉及表数量
   * 结果字段数量
3. 不改变查询结果区。

失败：

1. 编辑器对应行列展示红色错误标记。
2. 鼠标悬停展示错误 message。
3. 底部查询日志新增解析失败日志。
4. 不提交执行任务。

**12. SQL 执行 PRD**

**12.1 触发方式**

1. 点击“运行”按钮。
2. 使用快捷键 Shift + Enter。
3. 在历史记录中点击“重新运行”。

**12.2 运行前校验**

运行前按顺序执行：

1. 权限校验：用户拥有 sql\_query:execute。
2. 数据连接校验：数据连接存在且可用。
3. 数据库校验：数据库存在。
4. SQL 非空校验。
5. 自定义变量校验。
6. SQL 编译。
7. 单语句校验。
8. 只读语句校验。
9. 表权限校验。
10. 方言语法解析。
11. 执行资源可用校验。

任何一步失败，不创建查询任务。

**12.3 执行接口**

POST /api/sql-query/jobs

请求：

{

"projectId": "project\_001",

"workbookId": "wb\_001",

"dataSourceType": "MYSQL",

"connectionId": "conn\_001",

"databaseName": "sales",

"resourceId": null,

"rawSql": "SELECT \* FROM orders WHERE product\_name = '{{产品名称}}'",

"variableValues": {

"产品名称": "手机"

}

}

返回：

{

"jobId": "job\_001",

"status": "created"

}

**12.4 执行状态机**

created

→ parsing

→ waiting

→ running

→ success

created

→ parsing

→ failed

running

→ failed

running

→ cancelled

running

→ timeout

状态说明：

| **状态** | **含义** |
| --- | --- |
| created | 查询任务已创建 |
| parsing | 后端解析 SQL |
| waiting | 等待执行资源 |
| running | 数据源正在执行 |
| success | 查询成功，结果已落盘 |
| failed | 查询失败 |
| cancelled | 用户取消 |
| timeout | 超时 |

**12.5 页面可关闭逻辑**

运行任务创建后，后端异步执行。

逻辑：

1. 前端不依赖页面保持打开。
2. 用户关闭页面后，任务继续执行。
3. 用户重新进入工作簿时，系统拉取最近运行任务状态。
4. 如果任务完成，查询结果显示在底部结果区。
5. 如果任务失败，显示错误详情和日志。
6. 如果任务仍在运行，显示运行中状态和耗时。

**12.6 状态轮询**

前端轮询接口：

GET /api/sql-query/jobs/{jobId}

轮询频率：

| **任务状态** | **频率** |
| --- | --- |
| created / parsing / waiting | 1 秒 |
| running 前 60 秒 | 2 秒 |
| running 超过 60 秒 | 5 秒 |
| success / failed / cancelled / timeout | 停止轮询 |

返回：

{

"id": "job\_001",

"status": "running",

"startedAt": "2026-05-24 10:00:00",

"durationMs": 35000,

"resultRowCount": null,

"errorMessage": null

}

**12.7 执行中 UI**

运行中：

1. 运行按钮进入 loading。
2. 编辑器仍可编辑，但当前执行任务使用运行时 SQL 快照，不受后续编辑影响。
3. 底部结果区切换到“查询日志”。
4. 展示状态：

查询执行中，已运行 00:01:23

1. 支持“停止查询”按钮。
2. 停止后调用取消接口。

取消接口：

POST /api/sql-query/jobs/{jobId}/cancel

**12.8 执行成功逻辑**

成功后：

1. 任务状态更新为 success。
2. 保存查询历史。
3. 保存结果字段 schema。
4. 保存查询结果到结果存储。
5. 底部切换到“查询结果”Tab。
6. 展示第一页结果。
7. 下载按钮可用。
8. 新建图表按钮可用。
9. 工作簿列表更新最近执行时间。

**12.9 执行失败逻辑**

失败后：

1. 任务状态更新为 failed。
2. 保存查询历史。
3. 查询结果区展示失败原因。
4. 查询日志展示详细执行日志。
5. 下载按钮不可用。
6. 新建图表按钮不可用。

错误展示结构：

{

"errorCode": "SQL\_SYNTAX\_ERROR",

"errorMessage": "SQL 语法错误：第 2 行第 10 列附近存在异常",

"engineErrorMessage": "You have an error in your SQL syntax..."

}

前端展示：

查询失败

错误类型：SQL 语法错误

错误详情：第 2 行第 10 列附近存在异常

**13. 查询结果 PRD**

**13.1 查询结果区域 Tab**

底部查询结果区包含：

当前工作簿查询历史 | 查询结果 | 查询日志

当没有执行记录时：

暂无查询结果，请运行 SQL 后查看

**13.2 查询结果表格**

展示内容：

1. 字段名。
2. 字段类型。
3. 数据行。
4. 分页器。
5. 单列排序。
6. 单列值搜索。
7. 结果行数。
8. 查询耗时。

表格字段头展示：

字段名

字段类型

排序按钮

搜索按钮

**13.3 分页预览**

接口：

GET /api/sql-query/jobs/{jobId}/results?page=1&pageSize=100

参数：

| **参数** | **必填** | **说明** |
| --- | --- | --- |
| page | 是 | 从 1 开始 |
| pageSize | 是 | 10 / 20 / 50 / 100 / 500 |
| sortColumn | 否 | 排序字段 |
| sortOrder | 否 | asc / desc |
| filterColumn | 否 | 搜索字段 |
| filterValue | 否 | 搜索值 |

返回：

{

"columns": [

{

"name": "order\_id",

"type": "bigint",

"displayType": "number",

"nullable": false,

"index": 0

}

],

"rows": [

{

"order\_id": 10001,

"product\_name": "手机"

}

],

"page": 1,

"pageSize": 100,

"totalRows": 1200

}

**13.4 单列排序**

用户点击列头排序按钮。

排序状态：

未排序 → 升序 → 降序 → 未排序

规则：

1. 同一时间只允许一个字段排序。
2. 排序在服务端执行。
3. 切换排序后 page 重置为 1。
4. Map、Array 字段按 String 排序。
5. null 排序规则：
   * asc：null 在最后
   * desc：null 在最后

**13.5 单列值搜索**

用户点击列头搜索按钮。

搜索弹窗字段：

| **字段** | **类型** | **说明** |
| --- | --- | --- |
| 搜索值 | input | 输入要匹配的值 |
| 匹配方式 | select | contains / equals |

规则：

1. 同一时间只支持一个字段搜索。
2. 搜索在服务端结果集上执行。
3. 搜索不重新执行原 SQL。
4. 搜索值为空时清除搜索。
5. 切换搜索后 page 重置为 1。
6. 数值字段 equals 时按数值比较。
7. 字符串字段 contains 时按包含匹配。
8. 日期字段按格式化后的字符串匹配。

**13.6 复杂类型展示**

| **类型** | **展示** |
| --- | --- |
| Array | JSON 字符串 |
| Map | JSON 字符串 |
| Struct | JSON 字符串 |
| Binary | 展示 <binary> |
| Null | 空单元格 |

**13.7 空结果**

查询成功但行数为 0 时：

查询成功，共 0 行数据

下载按钮：

1. 仍可点击。
2. 下载 CSV 只包含表头。

新建图表按钮：

1. 可点击。
2. 进入可视化后提示暂无数据。

**14. 查询日志 PRD**

**14.1 日志内容**

查询日志记录：

1. 创建任务。
2. 编译变量。
3. 解析 SQL。
4. 权限校验。
5. 提交执行引擎。
6. 执行开始。
7. 执行完成。
8. 结果落盘。
9. 失败错误。

interface SqlQueryLog {

id: string;

jobId: string;

level: "INFO" | "WARN" | "ERROR";

message: string;

timestamp: string;

}

**14.2 日志展示**

表格字段：

| **时间** | **级别** | **内容** |
| --- | --- | --- |

规则：

1. 按时间升序展示。
2. ERROR 日志红色。
3. WARN 日志黄色。
4. 支持复制单条日志。
5. 支持下载日志文本。
6. 日志轮询与任务状态同步。

接口：

GET /api/sql-query/jobs/{jobId}/logs

**15. 查询历史 PRD**

**15.1 历史记录范围**

历史记录分两类：

1. 当前工作簿查询历史：底部结果区展示，仅展示当前工作簿的执行历史。
2. 全局查询历史：左侧工作栏“查询历史”展示，展示当前用户在当前项目下的 SQL 查询历史。

**15.2 历史字段**

| **字段** | **说明** |
| --- | --- |
| SQL 快照 | 执行时原 SQL |
| 查询状态 | success / failed / running 等 |
| 结果行数 | 成功后展示 |
| 数据连接 | 执行连接 |
| 数据库 | 执行数据库 |
| 执行人 | 用户 |
| 执行时间 | yyyy-MM-dd HH:mm:ss |
| 耗时 | 秒 |

**15.3 历史列表接口**

GET /api/sql-query/histories?projectId={projectId}&workbookId={workbookId}&page=1&pageSize=20

返回：

{

"items": [

{

"id": "his\_001",

"jobId": "job\_001",

"sqlSnapshot": "SELECT \* FROM orders",

"status": "success",

"resultRowCount": 100,

"connectionName": "mysql\_sales",

"databaseName": "sales",

"executedBy": "张三",

"executedAt": "2026-05-24 10:00:00",

"durationMs": 1200

}

],

"total": 1

}

**15.4 历史操作**

每条历史支持：

| **操作** | **逻辑** |
| --- | --- |
| 复制 SQL | 将 sqlSnapshot 复制到剪贴板 |
| 恢复到编辑器 | 将 sqlSnapshot 覆盖当前编辑器内容 |
| 重新运行 | 使用该历史的 SQL 快照重新运行 |
| 查看结果 | 如果结果未过期，展示历史结果 |
| 查看日志 | 打开对应任务日志 |

**复制 SQL**

点击复制图标：

1. 调用浏览器剪贴板 API。
2. 成功 Toast：

SQL 已复制

1. 失败时回退展示可手动复制弹窗。

**恢复到编辑器**

点击恢复：

1. 如果当前编辑器 dirty，弹出确认。
2. 确认后用历史 SQL 覆盖编辑器内容。
3. 重新识别自定义变量。
4. 标记 dirty = true。

**重新运行**

点击重新运行：

1. 使用历史 SQL 快照。
2. 使用历史数据源连接和数据库。
3. 如果历史数据源不可用，提示：

历史查询使用的数据连接已不可用，请重新选择数据连接后运行。

1. 如果变量已编译进历史 SQL，则不再弹出变量输入。
2. 创建新的查询任务和新的历史记录。

**16. 下载数据 PRD**

**16.1 展示条件**

下载按钮展示条件：

1. 当前查询任务状态为 success。
2. 当前查询结果未过期。
3. 用户拥有 sql\_query:download 权限。

否则：

| **场景** | **表现** |
| --- | --- |
| 未查询 | 不展示下载按钮 |
| 查询中 | 下载按钮置灰，tooltip：查询完成后可下载 |
| 查询失败 | 下载按钮置灰，tooltip：查询失败不可下载 |
| 无权限 | 不展示下载按钮 |
| 结果过期 | 按钮置灰，tooltip：查询结果已过期，请重新运行 |

**16.2 下载菜单**

点击下载按钮展示：

下载 UTF-8

下载 GBK

用户选择后创建下载任务。

接口：

POST /api/sql-query/jobs/{jobId}/downloads

请求：

{

"encoding": "UTF-8",

"fileFormat": "CSV"

}

返回：

{

"downloadTaskId": "download\_001",

"status": "running"

}

**16.3 CSV 生成逻辑**

CSV 生成规则：

1. 下载完整查询结果，不是当前分页。
2. 第一行为表头。
3. 表头使用结果字段名。
4. 字段顺序与查询结果 schema 一致。
5. null 输出为空字符串。
6. 字符串中包含逗号、双引号、换行时，整格使用双引号包裹。
7. 字符串中的双引号转义为两个双引号。
8. Array、Map 按 JSON 字符串写入。
9. 时间字段按查询结果返回格式写入。
10. 不对长数字添加额外字符，不改变原始数据值。

CSV 转义函数：

function escapeCsvCell(value: unknown): string {

if (value === null || value === undefined) return "";

const text = typeof value === "object" ? JSON.stringify(value) : String(value);

if (text.includes(",") || text.includes("\"") || text.includes("\n") || text.includes("\r")) {

return `"${text.replace(/"/g, "\"\"")}"`;

}

return text;

}

**16.4 文件命名**

文件名规则：

SQL查询结果\_{工作簿名或临时查询}\_{yyyyMMddHHmmss}\_{jobId}.csv

非法字符替换为下划线。

示例：

SQL查询结果\_订单明细查询\_20260524103000\_job\_001.csv

**16.5 下载任务轮询**

前端轮询：

GET /api/sql-query/downloads/{downloadTaskId}

返回：

{

"id": "download\_001",

"status": "success",

"fileName": "SQL查询结果\_订单明细查询\_20260524103000\_job\_001.csv",

"fileSizeBytes": 102400,

"downloadUrl": "/api/sql-query/downloads/download\_001/file"

}

成功后：

1. 浏览器自动下载。
2. Toast 显示“下载已开始”。

失败后：

下载失败，请稍后重试

**16.6 编码逻辑**

| **编码** | **逻辑** |
| --- | --- |
| UTF-8 | 使用 UTF-8 编码输出 CSV |
| GBK | 将 CSV 文本转换为 GBK 编码输出 |

如果 GBK 编码遇到无法表示的字符：

1. 默认替换为 ?。
2. 日志记录替换数量。
3. 不中断下载。

**16.7 下载限制**

系统配置：

interface DownloadLimitConfig {

maxRows: number;

maxFileSizeBytes: number;

expiredHours: number;

}

默认：

{

"maxRows": 1000000,

"maxFileSizeBytes": 1073741824,

"expiredHours": 24

}

超限处理：

1. 如果预计行数超过 maxRows，创建下载任务失败。
2. 提示：

查询结果超过下载上限，请缩小查询范围后重试。

1. 如果生成过程中超过文件大小上限，任务失败并删除临时文件。

**17. 查询结果保存至可视化 PRD**

**17.1 展示条件**

“新建图表”按钮展示条件：

1. 当前查询任务状态为 success。
2. 用户拥有 sql\_query:create\_visual\_chart 权限。
3. 查询结果未过期。
4. 查询结果字段数大于 0。

**17.2 点击新建图表流程**

用户点击“新建图表”：

1. 前端调用创建临时数据集接口。
2. 后端将查询结果注册为 SQL 查询临时数据集。
3. 前端展示 loading。
4. 轮询临时数据集准备状态。
5. 准备完成后跳转至可视化查询页面。
6. 可视化查询页面以临时数据集作为数据源。

接口：

POST /api/sql-query/jobs/{jobId}/visualization-datasets

请求：

{

"projectId": "project\_001"

}

返回：

{

"temporaryDatasetId": "tmp\_ds\_001",

"status": "creating"

}

**17.3 临时数据集模型**

interface SqlTemporaryDataset {

id: string;

projectId: string;

jobId: string;

name: string;

originType: "SQL\_QUERY\_RESULT";

schema: SqlResultColumn[];

status: "creating" | "ready" | "failed" | "converted" | "expired";

expiredAt: string;

createdBy: string;

createdAt: string;

}

名称规则：

SQL查询临时数据集\_{yyyyMMddHHmmss}

**17.4 临时数据集状态轮询**

接口：

GET /api/sql-query/visualization-datasets/{temporaryDatasetId}

状态：

| **状态** | **前端表现** |
| --- | --- |
| creating | loading：正在生成可视化数据 |
| ready | 自动跳转可视化查询 |
| failed | 提示生成失败 |
| converted | 已转正式数据集 |
| expired | 提示临时数据集已过期 |

如果创建时间超过 2 分钟仍未 ready：

1. 前端停止强制等待。
2. 显示：

数据集正在生成中，稍后可在可视化查询中查看。

1. 提供“继续等待”和“返回 SQL 查询”按钮。

**17.5 跳转可视化查询**

跳转 URL：

/visual-query/create?datasetId={temporaryDatasetId}&from=sql-query&jobId={jobId}

跳转后：

1. 可视化查询页面加载临时数据集。
2. 用户可配置图表。
3. 页面显示提示：

当前图表基于 SQL 查询临时数据集生成。保存图表后，该临时数据集将转为正式数据集。

**17.6 保存图表**

可视化页面点击保存图表：

弹窗字段：

| **字段** | **类型** | **必填** |
| --- | --- | --- |
| 图表名称 | input | 是 |
| 保存项目 | project select | 是 |
| 图表目录 | tree select | 否 |
| 数据集名称 | input | 是 |
| 描述 | textarea | 否 |

保存逻辑：

1. 校验图表名称。
2. 校验目标项目权限。
3. 校验数据集名称在目标项目下唯一。
4. 将临时数据集转为正式数据集。
5. 创建图表。
6. 如果保存项目与当前项目不同，保存后切换到目标项目。
7. 保存成功后，临时数据集不再参与定期清理。

接口：

POST /api/visual-query/charts

请求：

{

"temporaryDatasetId": "tmp\_ds\_001",

"targetProjectId": "project\_002",

"chartName": "订单趋势图",

"datasetName": "订单趋势\_SQL结果",

"chartConfig": {}

}

**17.7 临时数据集清理**

清理规则：

1. 未保存图表的临时数据集定期删除。
2. 默认保留 24 小时。
3. 清理后对应可视化页面无法继续使用。
4. 已转换正式数据集不清理。
5. 清理只删除临时数据集，不删除原查询历史。

**18. SQL 例行 PRD**

**18.1 例行使用条件**

只有满足以下条件，才允许配置 SQL 例行：

1. 图表来源为 SQL 查询结果。
2. 图表已保存。
3. SQL 查询临时数据集已转为正式数据集。
4. 用户拥有 sql\_query:create\_routine 权限。
5. 图表对应数据集仍存在。
6. 数据集仍保留 SQL 查询来源信息。
7. 查询使用的数据连接仍可用。
8. SQL 查询结果数据量不超过 1GB。

不满足时，例行按钮置灰并展示原因。

**18.2 例行入口**

在可视化查询页面左上角顶部工具栏展示“例行”按钮。

点击后打开“SQL 例行配置”弹窗。

**18.3 例行配置字段**

| **字段** | **类型** | **必填** | **说明** |
| --- | --- | --- | --- |
| 同步类型 | radio | 是 | 全量覆盖 / 分区覆盖 |
| 同步频率 | select | 是 | 每日 / 每周 / 每月 / Cron |
| 开始日期 | date | 是 | 例行数据更新从该日期起算 |
| 执行时间 | time | 是 | 调度执行时间 |
| Cron 表达式 | input | 条件必填 | 同步频率为 Cron 时展示 |
| 失败通知 | switch | 否 | 是否通知 |
| 通知对象 | user select | 条件必填 | 开启通知时必填 |

**18.4 同步类型逻辑**

**全量覆盖**

每次例行执行：

1. 运行保存时的 SQL。
2. 生成完整结果。
3. 覆盖目标数据集全部数据。
4. 可视化图表基于最新数据展示。

**分区覆盖**

使用条件：

1. 数据集中存在日期字段。
2. SQL 结果中存在可作为分区的日期字段。
3. 用户选择分区字段。

每次例行执行：

1. 运行 SQL。
2. 按分区字段覆盖对应分区。
3. 不影响其他分区数据。

**18.5 同步频率**

type RoutineScheduleType = "daily" | "weekly" | "monthly" | "cron";

每日：

{

"scheduleType": "daily",

"time": "08:00"

}

每周：

{

"scheduleType": "weekly",

"weekday": 1,

"time": "08:00"

}

每月：

{

"scheduleType": "monthly",

"dayOfMonth": 1,

"time": "08:00"

}

Cron：

{

"scheduleType": "cron",

"cron": "0 0 8 \* \* ?"

}

Cron 校验：

1. 表达式不能为空。
2. 必须符合 Quartz Cron 格式。
3. 最小执行间隔不能小于系统配置，默认 30 分钟。
4. 校验失败不能保存。

**18.6 配置日期起算逻辑**

SQL 例行的数据更新从配置日期起算。

规则：

1. scheduleStartAt 之前的数据不由例行任务补齐。
2. 配置前图表展示的数据，来自首次 SQL 查询时的查询结果。
3. 配置后每次调度执行产生新数据。
4. 如果用户需要历史数据，需要在数据集页面执行回溯或重新查询更长日期范围后再保存。

**18.7 日期筛选建议的产品实现**

可视化图表保存后，如果图表中存在日期筛选器，系统在配置例行时做提示。

规则：

1. 如果日期筛选器为固定日期，例如：

2026-05-01 至 2026-05-07

提示：

当前图表使用固定日期范围。例行执行后，新数据可能不会立即出现在图表中，建议使用“最近几天”或“最近有数几天”。

1. 如果日期筛选器为相对日期，例如：

最近 7 天

不提示。

**18.8 SQL 逻辑修改规则**

创建 SQL 例行后：

1. 例行任务使用保存图表时生成的数据集 SQL 快照。
2. 用户回到 SQL 查询工作簿修改原 SQL，不影响已经创建的例行任务。
3. 如果需要修改例行 SQL，需要进入可视化对应的数据集编辑页修改 SQL。
4. 修改数据集 SQL 后，下次例行使用新的数据集 SQL。
5. 工作簿 SQL 和例行数据集 SQL 不自动同步。

**18.9 Map / Array 类型处理**

SQL 例行中：

1. Map 类型按 String 处理。
2. Array 类型按 String 处理。
3. 可视化字段类型显示为 String。
4. 不支持对 Map / Array 内部元素进行原生聚合。
5. 用户需要分析内部元素时，应在 SQL 中先展开或转换字段。

**18.10 数据量限制**

创建图表例行的数据上限为 1GB。

逻辑：

1. 创建例行前，系统检查当前 SQL 查询结果大小。
2. 如果当前结果大小超过 1GB，禁止创建例行。
3. 如果例行执行时结果超过 1GB，本次例行失败。
4. 失败提示：

本次 SQL 例行结果超过 1GB 上限，请缩小查询分区或日期范围后重试。

1. 失败不会覆盖已有数据集数据。
2. 失败记录进入例行执行记录。

**18.11 例行保存接口**

POST /api/sql-query/routines

请求：

{

"projectId": "project\_002",

"chartId": "chart\_001",

"datasetId": "dataset\_001",

"syncType": "full\_overwrite",

"scheduleType": "daily",

"scheduleStartAt": "2026-05-24",

"executeTime": "08:00",

"notifyEnabled": true,

"notifyUserIds": ["user\_001"]

}

返回：

{

"routineId": "routine\_001",

"status": "enabled"

}

**18.12 例行执行记录**

interface SqlRoutineRunRecord {

id: string;

routineId: string;

status: "waiting" | "running" | "success" | "failed";

startedAt?: string;

finishedAt?: string;

durationMs?: number;

resultSizeBytes?: number;

resultRowCount?: number;

errorMessage?: string;

}

支持操作：

| **操作** | **条件** | **逻辑** |
| --- | --- | --- |
| 查看日志 | 全部状态 | 查看执行日志 |
| 手动运行一次 | enabled | 立即触发一次 |
| 暂停 | enabled | 停止后续调度 |
| 启用 | paused | 恢复调度 |
| 删除 | enabled / paused | 删除例行配置，不删除图表和数据集 |

**19. 查询结果预览与下载的交互差异**

**19.1 预览**

预览是为了快速查看结果。

规则：

1. 使用分页接口。
2. 支持单列排序。
3. 支持单列值搜索。
4. 不影响原查询历史。
5. 不生成下载文件。
6. 不改变结果存储。

**19.2 下载**

下载是为了导出完整结果。

规则：

1. 下载完整查询结果。
2. 不受当前分页影响。
3. 不受前端表格当前页影响。
4. 如果用户设置了结果搜索或排序，下载默认仍下载原始结果。
5. 下载菜单中可追加选项“下载当前筛选结果”，但本期默认不支持。
6. 下载文件为 CSV。

**20. API 设计**

**20.1 权限**

GET /api/sql-query/permissions/current?projectId={projectId}

**20.2 文件夹**

GET /api/sql-query/folders/tree?projectId={projectId}

POST /api/sql-query/folders

PUT /api/sql-query/folders/{folderId}

DELETE /api/sql-query/folders/{folderId}

**20.3 工作簿**

GET /api/sql-query/workbooks/{workbookId}

POST /api/sql-query/workbooks

PUT /api/sql-query/workbooks/{workbookId}

DELETE /api/sql-query/workbooks/{workbookId}

POST /api/sql-query/workbooks/{workbookId}/copy

POST /api/sql-query/workbooks/{workbookId}/move

**20.4 元数据**

GET /api/sql-query/metadata/connections

GET /api/sql-query/metadata/databases

GET /api/sql-query/metadata/tables

GET /api/sql-query/metadata/tables/{tableName}/columns

GET /api/sql-query/metadata/tables/{tableName}/preview

GET /api/sql-query/metadata/tables/{tableName}/partitions

GET /api/sql-query/metadata/tables/{tableName}/info

**20.5 编辑器**

POST /api/sql-query/editor/format

POST /api/sql-query/editor/suggestions

POST /api/sql-query/sql/parse

**20.6 执行任务**

POST /api/sql-query/jobs

GET /api/sql-query/jobs/{jobId}

POST /api/sql-query/jobs/{jobId}/cancel

GET /api/sql-query/jobs/{jobId}/results

GET /api/sql-query/jobs/{jobId}/logs

**20.7 历史**

GET /api/sql-query/histories

GET /api/sql-query/histories/{historyId}

**20.8 下载**

POST /api/sql-query/jobs/{jobId}/downloads

GET /api/sql-query/downloads/{downloadTaskId}

GET /api/sql-query/downloads/{downloadTaskId}/file

**20.9 可视化**

POST /api/sql-query/jobs/{jobId}/visualization-datasets

GET /api/sql-query/visualization-datasets/{temporaryDatasetId}

POST /api/sql-query/visualization-datasets/{temporaryDatasetId}/convert

**20.10 例行**

POST /api/sql-query/routines

GET /api/sql-query/routines/{routineId}

PUT /api/sql-query/routines/{routineId}

POST /api/sql-query/routines/{routineId}/run-once

POST /api/sql-query/routines/{routineId}/pause

POST /api/sql-query/routines/{routineId}/resume

DELETE /api/sql-query/routines/{routineId}

GET /api/sql-query/routines/{routineId}/runs

GET /api/sql-query/routine-runs/{runId}/logs

**21. 前端组件设计**

**21.1 页面级组件**

SqlQueryWorkbenchPage

**21.2 核心组件**

SqlLeftWorkbench

SqlWorkbookTree

SqlHistoryPanel

SqlMetadataExplorer

SqlEditorTabs

SqlEditor

SqlEditorToolbar

SqlVariablePanel

SqlVariableSettingModal

SqlResultPanel

SqlResultTable

SqlQueryLogPanel

SqlDownloadMenu

SqlVisualizationButton

SqlRoutineModal

**21.3 状态管理**

interface SqlQueryStore {

projectId: string;

permissions: SqlQueryPermissionState;

activeLeftPanel: "workbooks" | "history" | "metadata";

folders: SqlFolder[];

workbooks: SqlWorkbook[];

openedTabs: SqlEditorTabState[];

activeTabId?: string;

metadataState: SqlMetadataState;

currentJobByTabId: Record<string, SqlQueryJob>;

resultCacheByJobId: Record<string, SqlResultPage>;

logsByJobId: Record<string, SqlQueryLog[]>;

histories: SqlQueryHistory[];

loading: {

folders: boolean;

metadata: boolean;

saving: boolean;

parsing: boolean;

running: boolean;

result: boolean;

};

}

Tab 状态：

interface SqlEditorTabState {

tabId: string;

workbookId?: string;

temporaryQueryId?: string;

title: string;

sqlContent: string;

dataSourceType?: SqlDataSourceType;

connectionId?: string;

databaseName?: string;

resourceId?: string;

variableConfigs: SqlVariableConfig[];

variableValues: Record<string, string>;

dirty: boolean;

currentJobId?: string;

}

**22. 后端服务设计**

**22.1 服务模块**

SqlQueryPermissionService

SqlWorkbookService

SqlMetadataService

SqlEditorService

SqlVariableService

SqlParserService

SqlExecutionService

SqlResultService

SqlDownloadService

SqlVisualizationDatasetService

SqlRoutineService

**22.2 数据源适配器**

每种数据源实现统一接口。

interface SqlDataSourceAdapter {

type: SqlDataSourceType;

listDatabases(connectionId: string): Promise<string[]>;

listTables(params: {

connectionId: string;

databaseName: string;

keyword?: string;

page: number;

pageSize: number;

}): Promise<TableListResult>;

getColumns(params: {

connectionId: string;

databaseName: string;

tableName: string;

}): Promise<TableColumn[]>;

previewTable(params: {

connectionId: string;

databaseName: string;

tableName: string;

limit: number;

}): Promise<QueryPreviewResult>;

parseSql(params: {

connectionId: string;

databaseName: string;

sql: string;

}): Promise<SqlParseResult>;

executeSql(params: {

connectionId: string;

databaseName: string;

sql: string;

resourceId?: string;

jobId: string;

}): Promise<SqlExecutionResult>;

cancel(jobId: string): Promise<void>;

}

**22.3 查询结果存储**

查询成功后，需要把结果存储为可分页、可下载、可转临时数据集的结构。

interface SqlResultStore {

saveResult(jobId: string, columns: SqlResultColumn[], rowsIterator: AsyncIterable<Record<string, any>>): Promise<string>;

getPage(params: {

resultStorageId: string;

page: number;

pageSize: number;

sortColumn?: string;

sortOrder?: "asc" | "desc";

filterColumn?: string;

filterValue?: string;

filterMode?: "contains" | "equals";

}): Promise<SqlResultPage>;

exportCsv(params: {

resultStorageId: string;

encoding: "UTF-8" | "GBK";

outputPath: string;

}): Promise<ExportResult>;

}

**23. 异常与边界场景**

**23.1 数据连接失效**

场景：

1. 用户打开工作簿。
2. 工作簿中保存的数据连接已删除或无权限。

处理：

1. 数据连接选择框显示：

原数据连接不可用

1. 运行按钮置灰。
2. 用户重新选择数据连接后可运行。
3. 保存时用新连接覆盖旧连接。

**23.2 数据库不存在**

运行前校验数据库。

提示：

当前数据库不存在或无权限访问，请重新选择数据库。

**23.3 表权限变化**

如果用户历史 SQL 中访问的表权限被收回：

1. 工作簿仍可打开。
2. SQL 内容仍可编辑。
3. 运行时报错：

无权限访问表：database.table

1. 查询历史仍保留 SQL 快照。

**23.4 查询结果过期**

结果存储过期后：

1. 历史记录仍展示。
2. “查看结果”不可用。
3. “下载”不可用。
4. “新建图表”不可用。
5. 提示：

查询结果已过期，请重新运行 SQL。

**23.5 多语句执行**

如果 SQL 中存在多个语句：

SELECT \* FROM a;

SELECT \* FROM b;

处理：

1. 解析失败。
2. 不创建执行任务。
3. 提示：

当前仅支持单一 SQL 语句执行，请拆分到不同查询框中分别运行。

**23.6 变量未加引号**

系统不自动处理该问题，但可以在解析失败时提示。

例如：

WHERE product\_name = {{产品名称}}

如果变量值为中文，解析失败时提示：

变量替换后的 SQL 可能缺少字符串引号。Text 类型变量不会自动添加引号，请在 SQL 中手动添加。

**23.7 下载乱码与长数字**

产品下载逻辑不修改数据值。为了减少乱码：

1. 提供 UTF-8 和 GBK 两种编码。
2. 用户按使用场景选择。
3. 长数字不会自动转文本格式。
4. CSV 文件由 Excel 打开时可能出现科学计数，这是 Excel 展示行为，不改变下载数据。

**23.8 可视化创建延迟**

保存至可视化后，如果临时数据集创建较慢：

1. 持续展示 loading。
2. 超过 2 分钟提示可能存在延迟。
3. 用户可返回 SQL 查询。
4. 后端继续创建。
5. 创建失败写入错误日志。

**23.9 SQL 例行修改原工作簿无效**

创建例行后，用户修改原 SQL 工作簿：

1. 不影响例行。
2. 不展示同步确认。
3. 在例行详情中展示提示：

该例行任务使用可视化数据集中的 SQL 逻辑。修改原 SQL 查询文件不会影响此例行。

**24. 验收标准**

**24.1 工作簿与文件夹**

1. 用户可创建、重命名、删除文件夹。
2. 同级文件夹重名时保存失败。
3. 用户可创建临时查询并保存为工作簿。
4. 已保存工作簿刷新页面后内容、数据源、变量配置保持一致。
5. 删除文件夹时，文件夹内工作簿同步不可见。
6. 无权限用户看不到保存、删除操作。

**24.2 库表查询**

1. 用户可选择 MYSQL、DORIS、DATA\_LAKE\_API、HIVE\_JDBC 数据源。
2. 用户选择连接后可加载数据库。
3. 用户选择数据库后可加载表列表。
4. 无权限表置灰。
5. 有权限表 hover 可查看字段、预览、分区、表信息。
6. 点击插入表名后，表名插入到当前光标位置。
7. 点击插入查询语句后，SQL 编辑器生成 SELECT 模板。

**24.3 SQL 编辑**

1. 输入 SQL 后编辑器标记未保存。
2. 格式化后 SQL 按方言格式化。
3. 函数联想出现时，按 Enter 可输入首条联想。
4. 快捷键运行、解析、格式化、保存均可生效。
5. 工具栏可拖动且刷新后恢复位置。

**24.4 自定义变量**

1. SQL 中输入 {{变量名}} 后，变量区自动出现输入框。
2. 删除 SQL 中变量后，变量区对应输入框消失。
3. Text 类型变量运行时不自动加引号。
4. Dropdown List 每行一个选项。
5. Date 类型支持三种日期格式。
6. Date and Time 支持两种分钟级格式。
7. Date and Time with seconds 支持两种秒级格式。
8. 必填变量为空时不能解析和运行。

**24.5 SQL 解析与执行**

1. 空 SQL 不能运行。
2. 未选择数据源不能运行。
3. 多 SQL 语句不能运行。
4. DDL / DML 不能运行。
5. 合法 SQL 可成功提交任务。
6. 查询期间关闭页面，重新进入后能看到任务结果。
7. 查询失败能展示错误原因和日志。
8. 查询成功后展示结果、行数、耗时。

**24.6 查询结果**

1. 查询结果支持分页。
2. 查询结果支持单列排序。
3. 查询结果支持单列值搜索。
4. 排序和搜索不重新执行 SQL。
5. 空结果展示 0 行且可下载表头。
6. Map、Array 在结果表中以 JSON 字符串展示。

**24.7 查询历史**

1. 每次执行生成一条历史记录。
2. 历史记录包含 SQL 快照、状态、结果行数。
3. 点击复制图标可复制历史 SQL。
4. 可从历史恢复 SQL 到编辑器。
5. 可重新运行历史 SQL。
6. 结果过期后历史仍保留，但不可查看结果和下载。

**24.8 下载**

1. 查询成功后可下载。
2. 查询失败、运行中、结果过期不可下载。
3. 支持 UTF-8 下载。
4. 支持 GBK 下载。
5. 下载文件为 CSV。
6. CSV 首行为表头。
7. CSV 对逗号、引号、换行正确转义。
8. 下载内容为完整结果，不是当前分页。

**24.9 可视化**

1. 查询成功后可点击新建图表。
2. 点击后生成 SQL 查询临时数据集。
3. 临时数据集 ready 后跳转可视化查询。
4. 保存图表后临时数据集转为正式数据集。
5. 未保存图表的临时数据集按过期策略清理。

**24.10 SQL 例行**

1. 只有已保存的 SQL 查询图表可以配置例行。
2. 未保存图表不可配置例行。
3. Map、Array 字段在例行中按 String 处理。
4. 例行数据更新从配置日期起算。
5. 修改原 SQL 工作簿不影响已创建例行。
6. 例行结果超过 1GB 时执行失败且不覆盖旧数据。
7. 例行可暂停、启用、删除、手动运行一次。