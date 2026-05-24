import type {
  SqlDataSourceType,
  SqlFolder,
  SqlMetadataConnection,
  SqlMetadataTable,
  SqlQueryFeatureSwitch,
  SqlQueryHistory,
  SqlQueryJob,
  SqlQueryLog,
  SqlQueryPermissionState,
  SqlResultColumn,
  SqlTableColumn,
  SqlTableInfo,
  SqlTablePartition,
  SqlWorkbook,
} from '@/types/sqlQuery'

export const sqlQueryFeatureSwitch: SqlQueryFeatureSwitch = {
  tenantId: 'tenant_demo',
  enabled: true,
  minVersion: '2026.05',
  allowedProjectIds: ['project_001', 'project_002'],
}

export const sqlQueryPermission: SqlQueryPermissionState = {
  canView: true,
  canCreateWorkbook: true,
  canEditWorkbook: true,
  canDeleteWorkbook: true,
  canExecute: true,
  canDownload: true,
  canCreateVisualChart: true,
  canCreateRoutine: true,
  canViewHistory: true,
  canManageFolder: true,
}

export const supportedSqlSourceTypes: SqlDataSourceType[] = ['MYSQL', 'DORIS', 'DATA_LAKE_API', 'HIVE_JDBC']

export const mockSqlFolders: SqlFolder[] = [
  {
    id: 'root',
    projectId: 'project_001',
    parentId: null,
    name: '全部查询',
    sortIndex: 0,
    createdBy: 'current_user',
    createdAt: '2026-05-20 09:00:00',
    updatedBy: 'current_user',
    updatedAt: '2026-05-20 09:00:00',
  },
  {
    id: 'folder_sales',
    projectId: 'project_001',
    parentId: 'root',
    name: '销售分析',
    sortIndex: 1,
    createdBy: 'current_user',
    createdAt: '2026-05-20 09:10:00',
    updatedBy: 'current_user',
    updatedAt: '2026-05-20 09:10:00',
  },
  {
    id: 'folder_operation',
    projectId: 'project_001',
    parentId: 'root',
    name: '运营复盘',
    sortIndex: 2,
    createdBy: 'current_user',
    createdAt: '2026-05-21 14:20:00',
    updatedBy: 'current_user',
    updatedAt: '2026-05-21 14:20:00',
  },
]

export const mockSqlWorkbooks: SqlWorkbook[] = [
  {
    id: 'wb_orders_daily',
    projectId: 'project_001',
    folderId: 'folder_sales',
    name: '订单明细查询',
    description: '按日期和品类查看订单明细，可保存为可视化图表。',
    sqlContent:
      "SELECT order_id, product_name, category, amount, order_date, tags, ext\nFROM `sales`.`orders`\nWHERE order_date >= '{{开始日期}}'\n  AND category = '{{品类}}'\nLIMIT 100",
    dataSourceType: 'MYSQL',
    connectionId: 'conn_mysql_sales',
    databaseName: 'sales',
    variableConfigs: [
      {
        name: '开始日期',
        type: 'date',
        required: true,
        defaultValue: '2026-05-01',
        dateFormat: 'YYYY-MM-DD',
        createdFromSql: true,
        updatedAt: '2026-05-23 18:20:00',
      },
      {
        name: '品类',
        type: 'dropdown',
        required: true,
        defaultValue: '手机',
        options: ['手机', '电脑', '家电', '服饰'],
        createdFromSql: true,
        updatedAt: '2026-05-23 18:20:00',
      },
    ],
    ownerId: 'current_user',
    ownerName: 'Chaoyang Xu',
    status: 'saved',
    createdBy: 'current_user',
    createdAt: '2026-05-22 09:00:00',
    updatedBy: 'current_user',
    updatedAt: '2026-05-23 18:20:00',
    lastExecutedAt: '2026-05-24 09:42:00',
  },
  {
    id: 'wb_user_retain',
    projectId: 'project_001',
    folderId: 'folder_operation',
    name: '用户留存临时口径',
    description: '运营例会使用的留存口径。',
    sqlContent:
      "WITH active_users AS (\n  SELECT user_id, active_date\n  FROM user_behavior.daily_active_users\n)\nSELECT active_date, COUNT(DISTINCT user_id) AS active_uv\nFROM active_users\nGROUP BY active_date\nORDER BY active_date DESC\nLIMIT 100",
    dataSourceType: 'DORIS',
    connectionId: 'conn_doris_warehouse',
    databaseName: 'user_behavior',
    variableConfigs: [],
    ownerId: 'current_user',
    ownerName: 'Chaoyang Xu',
    status: 'saved',
    createdBy: 'current_user',
    createdAt: '2026-05-21 15:30:00',
    updatedBy: 'current_user',
    updatedAt: '2026-05-23 11:10:00',
    lastExecutedAt: '2026-05-23 11:12:00',
  },
]

export const mockSqlConnections: SqlMetadataConnection[] = [
  { id: 'conn_mysql_sales', name: 'mysql_sales', type: 'MYSQL', permission: 'readable' },
  { id: 'conn_mysql_finance', name: 'mysql_finance_sensitive', type: 'MYSQL', permission: 'readable' },
  { id: 'conn_doris_warehouse', name: 'doris_warehouse', type: 'DORIS', permission: 'readable' },
  { id: 'conn_lake_api', name: 'lake_api_marketing', type: 'DATA_LAKE_API', permission: 'readable', resourceRequired: true },
  { id: 'conn_hive_jdbc', name: 'hive_jdbc_prod', type: 'HIVE_JDBC', permission: 'readable', resourceRequired: true },
]

export const mockSqlDatabases: Record<string, string[]> = {
  conn_mysql_sales: ['sales', 'crm', 'inventory'],
  conn_mysql_finance: ['finance', 'risk_control'],
  conn_doris_warehouse: ['user_behavior', 'ads_report', 'ab_test'],
  conn_lake_api: ['marketing_lake', 'traffic_lake'],
  conn_hive_jdbc: ['dwd', 'dws', 'ads'],
}

export const mockSqlTables: Record<string, SqlMetadataTable[]> = {
  'conn_mysql_sales:sales': [
    { name: 'orders', type: 'table', hasPermission: true, isPartitioned: false, comment: '订单明细事实表' },
    { name: 'order_items', type: 'table', hasPermission: true, isPartitioned: false, comment: '订单商品明细' },
    { name: 'customer_private', type: 'table', hasPermission: false, isPartitioned: false, comment: '客户隐私信息' },
    { name: 'daily_sales_summary', type: 'view', hasPermission: true, isPartitioned: true, comment: '销售日汇总视图' },
  ],
  'conn_mysql_sales:crm': [
    { name: 'users', type: 'table', hasPermission: true, isPartitioned: false, comment: '用户主表' },
    { name: 'user_profile', type: 'table', hasPermission: true, isPartitioned: false, comment: '用户画像宽表' },
  ],
  'conn_mysql_finance:finance': [
    { name: 'payments', type: 'table', hasPermission: true, isPartitioned: true, comment: '支付流水' },
    { name: 'private_accounts', type: 'table', hasPermission: false, isPartitioned: false, comment: '敏感账户表' },
  ],
  'conn_doris_warehouse:user_behavior': [
    { name: 'daily_active_users', type: 'table', hasPermission: true, isPartitioned: true, comment: '日活用户表' },
    { name: 'event_log', type: 'table', hasPermission: true, isPartitioned: true, comment: '事件日志明细' },
  ],
  'conn_lake_api:marketing_lake': [
    { name: 'campaign_clicks', type: 'table', hasPermission: true, isPartitioned: true, comment: '广告点击明细' },
    { name: 'ad_costs', type: 'table', hasPermission: true, isPartitioned: true, comment: '广告花费' },
  ],
  'conn_hive_jdbc:dwd': [
    { name: 'dwd_trade_order_di', type: 'table', hasPermission: true, isPartitioned: true, comment: '交易订单明细' },
    { name: 'dwd_user_event_di', type: 'table', hasPermission: true, isPartitioned: true, comment: '用户行为明细' },
  ],
}

export const defaultSqlColumns: SqlTableColumn[] = [
  { name: 'order_id', type: 'bigint', nullable: false, comment: '订单 ID' },
  { name: 'product_name', type: 'varchar(128)', nullable: false, comment: '商品名称' },
  { name: 'category', type: 'varchar(64)', nullable: true, comment: '商品品类' },
  { name: 'amount', type: 'decimal(18,2)', nullable: false, comment: '订单金额' },
  { name: 'order_date', type: 'date', nullable: false, comment: '下单日期' },
  { name: 'tags', type: 'array<string>', nullable: true, comment: '标签列表' },
  { name: 'ext', type: 'map<string,string>', nullable: true, comment: '扩展属性' },
]

export const mockSqlColumns: Record<string, SqlTableColumn[]> = {
  orders: defaultSqlColumns,
  order_items: [
    { name: 'order_id', type: 'bigint', nullable: false, comment: '订单 ID' },
    { name: 'sku_id', type: 'bigint', nullable: false, comment: 'SKU ID' },
    { name: 'sku_name', type: 'varchar(128)', nullable: false, comment: 'SKU 名称' },
    { name: 'quantity', type: 'int', nullable: false, comment: '购买件数' },
    { name: 'item_amount', type: 'decimal(18,2)', nullable: false, comment: '明细金额' },
  ],
  daily_sales_summary: [
    { name: 'dt', type: 'date', nullable: false, comment: '业务日期' },
    { name: 'category', type: 'varchar(64)', nullable: false, comment: '品类' },
    { name: 'order_count', type: 'bigint', nullable: false, comment: '订单量' },
    { name: 'gmv', type: 'decimal(18,2)', nullable: false, comment: 'GMV' },
  ],
  daily_active_users: [
    { name: 'user_id', type: 'bigint', nullable: false, comment: '用户 ID' },
    { name: 'active_date', type: 'date', nullable: false, comment: '活跃日期' },
    { name: 'channel', type: 'varchar(64)', nullable: true, comment: '渠道' },
  ],
}

export const mockSqlPartitions: Record<string, SqlTablePartition[]> = {
  daily_sales_summary: [{ column: 'dt', type: 'date', latestValue: '2026-05-24' }],
  payments: [{ column: 'pay_date', type: 'date', latestValue: '2026-05-23' }],
  daily_active_users: [{ column: 'active_date', type: 'date', latestValue: '2026-05-24' }],
  event_log: [{ column: 'dt', type: 'date', latestValue: '2026-05-24' }],
  campaign_clicks: [{ column: 'dt', type: 'date', latestValue: '2026-05-24' }],
  dwd_trade_order_di: [{ column: 'dt', type: 'date', latestValue: '2026-05-24' }],
}

export const mockSqlResultColumns: SqlResultColumn[] = [
  { name: 'order_id', type: 'bigint', displayType: 'number', nullable: false, index: 0 },
  { name: 'product_name', type: 'varchar', displayType: 'string', nullable: false, index: 1 },
  { name: 'category', type: 'varchar', displayType: 'string', nullable: true, index: 2 },
  { name: 'amount', type: 'decimal', displayType: 'number', nullable: false, index: 3 },
  { name: 'order_date', type: 'date', displayType: 'date', nullable: false, index: 4 },
  { name: 'tags', type: 'array<string>', displayType: 'array_as_string', nullable: true, index: 5 },
  { name: 'ext', type: 'map<string,string>', displayType: 'map_as_string', nullable: true, index: 6 },
]

export const mockSqlJobs: SqlQueryJob[] = [
  {
    id: 'job_seed_success',
    projectId: 'project_001',
    workbookId: 'wb_orders_daily',
    dataSourceType: 'MYSQL',
    connectionId: 'conn_mysql_sales',
    databaseName: 'sales',
    rawSql: mockSqlWorkbooks[0]?.sqlContent ?? '',
    compiledSql:
      "SELECT order_id, product_name, category, amount, order_date, tags, ext\nFROM `sales`.`orders`\nWHERE order_date >= '2026-05-01'\n  AND category = '手机'\nLIMIT 100",
    sqlHash: 'seed_success',
    variableValueSnapshot: { 开始日期: '2026-05-01', 品类: '手机' },
    status: 'success',
    resultRowCount: 128,
    resultColumnCount: mockSqlResultColumns.length,
    resultStorageId: 'result_job_seed_success',
    resultExpired: false,
    resultSizeBytes: 5242880,
    startedAt: '2026-05-24 09:42:00',
    finishedAt: '2026-05-24 09:42:02',
    durationMs: 2180,
    createdBy: 'current_user',
    createdAt: '2026-05-24 09:42:00',
  },
  {
    id: 'job_seed_expired',
    projectId: 'project_001',
    workbookId: 'wb_user_retain',
    dataSourceType: 'DORIS',
    connectionId: 'conn_doris_warehouse',
    databaseName: 'user_behavior',
    rawSql: mockSqlWorkbooks[1]?.sqlContent ?? '',
    compiledSql: mockSqlWorkbooks[1]?.sqlContent ?? '',
    sqlHash: 'seed_expired',
    variableValueSnapshot: {},
    status: 'success',
    resultRowCount: 31,
    resultColumnCount: 2,
    resultStorageId: 'result_job_seed_expired',
    resultExpired: true,
    resultSizeBytes: 102400,
    startedAt: '2026-05-20 10:00:00',
    finishedAt: '2026-05-20 10:00:01',
    durationMs: 1320,
    createdBy: 'current_user',
    createdAt: '2026-05-20 10:00:00',
  },
]

export const mockSqlHistories: SqlQueryHistory[] = [
  {
    id: 'his_seed_success',
    projectId: 'project_001',
    workbookId: 'wb_orders_daily',
    jobId: 'job_seed_success',
    sqlSnapshot: mockSqlWorkbooks[0]?.sqlContent ?? '',
    dataSourceType: 'MYSQL',
    connectionId: 'conn_mysql_sales',
    connectionName: 'mysql_sales',
    databaseName: 'sales',
    status: 'success',
    resultRowCount: 128,
    resultExpired: false,
    executedBy: 'Chaoyang Xu',
    executedAt: '2026-05-24 09:42:02',
    durationMs: 2180,
  },
  {
    id: 'his_seed_expired',
    projectId: 'project_001',
    workbookId: 'wb_user_retain',
    jobId: 'job_seed_expired',
    sqlSnapshot: mockSqlWorkbooks[1]?.sqlContent ?? '',
    dataSourceType: 'DORIS',
    connectionId: 'conn_doris_warehouse',
    connectionName: 'doris_warehouse',
    databaseName: 'user_behavior',
    status: 'success',
    resultRowCount: 31,
    resultExpired: true,
    executedBy: 'Chaoyang Xu',
    executedAt: '2026-05-20 10:00:01',
    durationMs: 1320,
  },
]

export const mockSqlLogs: SqlQueryLog[] = [
  { id: 'log_seed_1', jobId: 'job_seed_success', level: 'INFO', message: '创建查询任务', timestamp: '2026-05-24 09:42:00' },
  { id: 'log_seed_2', jobId: 'job_seed_success', level: 'INFO', message: '编译变量并解析 SQL 成功', timestamp: '2026-05-24 09:42:00' },
  { id: 'log_seed_3', jobId: 'job_seed_success', level: 'INFO', message: '提交执行引擎 mysql_sales', timestamp: '2026-05-24 09:42:01' },
  { id: 'log_seed_4', jobId: 'job_seed_success', level: 'INFO', message: '结果落盘完成，共 128 行', timestamp: '2026-05-24 09:42:02' },
]

export const makeTableInfo = (
  tableName: string,
  databaseName: string,
  connectionName: string,
  tableType: 'table' | 'view',
  comment = '业务查询表',
): SqlTableInfo => ({
  tableName,
  databaseName,
  connectionName,
  tableType,
  comment,
})
