import type {
  DatasetSchema,
  ExportResource,
  FieldSchema,
  ImportParseResult,
  ModelingEdge,
  ModelingNode,
  NodePort,
  OperatorConfigField,
  OperatorDefinition,
  OperatorType,
  PreviewResult,
  RuntimeConfig,
  TaskRunRecord,
  VisualModelingPermission,
  VisualModelingTask,
  VisualModelingTaskType,
} from '@/types/visualModeling'

const tableInput = (id = 'input'): NodePort => ({
  id,
  name: '输入表',
  portType: 'input',
  dataKind: 'table',
  required: true,
  maxConnections: 1,
})

const tableOutput = (id = 'output'): NodePort => ({
  id,
  name: '输出表',
  portType: 'output',
  dataKind: 'table',
  required: true,
})

const streamInput = (id = 'input'): NodePort => ({
  id,
  name: '实时流',
  portType: 'input',
  dataKind: 'stream',
  required: true,
  maxConnections: 1,
})

const streamOutput = (id = 'output'): NodePort => ({
  id,
  name: '输出流',
  portType: 'output',
  dataKind: 'stream',
  required: true,
})

const modelInput = (id = 'model'): NodePort => ({
  id,
  name: '模型',
  portType: 'input',
  dataKind: 'model',
  required: true,
  maxConnections: 1,
})

const modelOutput = (id = 'model'): NodePort => ({
  id,
  name: '模型',
  portType: 'output',
  dataKind: 'model',
  required: true,
})

const field = (
  name: string,
  displayName: string,
  type: FieldSchema['type'],
  nullable = true,
  role: FieldSchema['role'] = 'regular',
): FieldSchema => ({ name, displayName, type, nullable, role })

export const visualModelingPermission: VisualModelingPermission = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canRun: true,
  canManagePermission: true,
  canExport: true,
  canImport: true,
  canUseRealtimeLabelGenerate: false,
}

export const visualModelingFolders = [
  { id: 'folder_default', name: '默认目录' },
  { id: 'folder_growth', name: '增长分析' },
  { id: 'folder_realtime', name: '实时链路' },
  { id: 'folder_ml', name: '机器学习' },
]

export const visualModelingQueues = [
  { id: 'queue_001', name: '默认队列', available: true },
  { id: 'queue_realtime', name: '实时 Flink 队列', available: true },
  { id: 'queue_ml', name: '机器学习高内存队列', available: true },
  { id: 'queue_archived', name: '历史队列（不可用）', available: false },
]

export const visualModelingConnections = [
  { id: 'conn_clickhouse_ad', name: '行为数仓 ClickHouse', type: 'ClickHouse', writable: true, realtime: false },
  { id: 'conn_hive_trade', name: '交易数仓 Hive', type: 'Hive', writable: true, realtime: false },
  { id: 'conn_mysql_member', name: '会员中心 MySQL', type: 'MySQL', writable: true, realtime: false },
  { id: 'conn_kafka_behavior', name: '实时行为 Kafka', type: 'Kafka', writable: true, realtime: true },
  { id: 'conn_ck_external', name: '外部 ClickHouse 集群', type: 'ClickHouse', writable: true, realtime: false },
]

export const visualModelingDatasets = [
  { id: 'ds_ad_watch_detail', name: '广告观看明细数据集', folderId: 'folder_growth' },
  { id: 'ds_member_profile', name: '会员画像基础数据集', folderId: 'folder_growth' },
  { id: 'ds_payment_success', name: '支付成功订单数据集', folderId: 'folder_ml' },
  { id: 'ds_realtime_profile', name: '实时用户画像宽表', folderId: 'folder_realtime' },
]

export const sampleSchemas: Record<string, DatasetSchema> = {
  event: {
    rowCountEstimate: 186420000,
    partitions: [field('event_date', '事件日期', 'date', false, 'partition')],
    fields: [
      field('user_id', '用户 ID', 'string', false, 'id'),
      field('event_name', '事件名称', 'string'),
      field('event_time', '事件时间', 'datetime', false),
      field('ad_position', '广告位', 'string'),
      field('game_type', '游戏类型', 'string'),
      field('revenue', '广告收益', 'decimal', true),
      field('coin_balance', '金币余额', 'int', true),
      field('is_paid', '是否付费', 'boolean', true),
    ],
  },
  payment: {
    rowCountEstimate: 3460000,
    partitions: [field('pay_date', '支付日期', 'date', false, 'partition')],
    fields: [
      field('order_id', '订单 ID', 'string', false, 'id'),
      field('user_id', '用户 ID', 'string', false, 'id'),
      field('pay_amount', '支付金额', 'decimal', false),
      field('pay_status', '支付状态', 'string', false),
      field('pay_time', '支付时间', 'datetime', false),
    ],
  },
  stream: {
    rowCountEstimate: 0,
    fields: [
      field('user_id', '用户 ID', 'string', false, 'id'),
      field('event', '事件 JSON', 'json', false),
      field('event_time', '事件时间', 'datetime', false),
      field('partition_id', '分区', 'int', false, 'partition'),
      field('offset', 'Offset', 'bigint', false),
    ],
  },
  modelOutput: {
    rowCountEstimate: 9820000,
    fields: [
      field('user_id', '用户 ID', 'string', false, 'id'),
      field('prediction', '预测结果', 'double', true, 'prediction'),
      field('prediction_probability', '预测概率', 'double', true, 'prediction'),
    ],
  },
}

const commonTableTransformFields: OperatorConfigField[] = [
  { key: 'selectedFields', label: '处理字段', control: 'multi-select', required: true, help: '从上游字段中选择。' },
  { key: 'keepOriginalFields', label: '保留原字段', control: 'switch', defaultValue: true },
]

const datasetOutputFields: OperatorConfigField[] = [
  { key: 'outputMode', label: '输出方式', control: 'radio', required: true, defaultValue: 'create', options: [
    { label: '新建数据集', value: 'create' },
    { label: '写入已有数据集', value: 'existing' },
  ] },
  { key: 'datasetName', label: '数据集名称', control: 'input', required: true, placeholder: '例如：客户意向度预测结果' },
  { key: 'folderId', label: '保存目录', control: 'select', required: true, defaultValue: 'folder_default' },
  { key: 'writeMode', label: '写入模式', control: 'select', required: true, defaultValue: 'partition_overwrite', options: [
    { label: '覆盖整表', value: 'overwrite' },
    { label: '追加写入', value: 'append' },
    { label: '按分区覆盖', value: 'partition_overwrite' },
  ] },
  { key: 'partitionField', label: '分区字段', control: 'select', placeholder: '可选' },
  { key: 'datasetDescription', label: '数据集描述', control: 'textarea' },
  { key: 'autoPartitionProbe', label: '自动分区探测', control: 'switch', defaultValue: true },
  { key: 'partitionExpression', label: '分区表达式', control: 'input', placeholder: '${bizDate}' },
  { key: 'apiDependencyUrl', label: '三方 API 依赖', control: 'input', placeholder: 'https://example.com/ready' },
  { key: 'dependencySuccessExpression', label: '成功判断表达式', control: 'input', placeholder: '$.status == \"ok\"' },
]

const realtimeOnlyReason = '该算子仅支持实时任务'
const offlineOnlyReason = '该算子仅支持离线任务'

const op = (
  type: OperatorType,
  category: OperatorDefinition['category'],
  name: string,
  description: string,
  aliases: string[],
  inputPorts: NodePort[],
  outputPorts: NodePort[],
  allowedTaskTypes: VisualModelingTaskType[],
  configFields: OperatorConfigField[],
  unavailableReason?: string,
): OperatorDefinition => ({
  type,
  category,
  name,
  aliases,
  description,
  inputPorts,
  outputPorts,
  allowedTaskTypes,
  configFields,
  unavailableReason,
})

export const visualModelingOperators: OperatorDefinition[] = [
  op('connection_table', '数据输入', '数据连接输入', '从 MySQL、Hive、ClickHouse、Kafka 等连接读取源表。', ['table', 'mysql', 'hive', 'kafka'], [], [tableOutput()], ['offline', 'realtime'], [
    { key: 'sourceType', label: '数据来源类型', control: 'select', required: true, defaultValue: 'connection_table', options: [
      { label: '数据连接', value: 'connection_table' },
      { label: '数据集', value: 'dataset' },
      { label: '自定义 SQL', value: 'custom_sql' },
    ] },
    { key: 'connectionId', label: '数据连接', control: 'select', required: true },
    { key: 'databaseName', label: '数据库 / Schema', control: 'select', required: true },
    { key: 'tableName', label: '数据表 / Topic', control: 'select', required: true },
    { key: 'extractMode', label: '抽取方式', control: 'radio', required: true, defaultValue: 'partition', options: [
      { label: '全量', value: 'full' },
      { label: '增量', value: 'incremental' },
      { label: '分区', value: 'partition' },
    ] },
    { key: 'filterGroup', label: '字段筛选', control: 'condition-builder' },
    { key: 'previewLimit', label: '预览行数', control: 'number', defaultValue: 100, min: 10, max: 1000 },
  ]),
  op('visual_modeling_dataset', '数据输入', '建模数据集', '选择由可视化建模产出的平台数据集作为输入。', ['dataset'], [], [tableOutput()], ['offline'], [
    { key: 'datasetId', label: '数据集', control: 'select', required: true },
    { key: 'previewLimit', label: '预览行数', control: 'number', defaultValue: 100, min: 10, max: 1000 },
  ], offlineOnlyReason),
  op('intelligent_insight_dataset', '数据输入', '智能洞察数据集', '复用数据洞察沉淀的数据集。', ['insight'], [], [tableOutput()], ['offline'], [
    { key: 'datasetId', label: '智能洞察数据集', control: 'select', required: true },
    { key: 'filterGroup', label: '字段筛选', control: 'condition-builder' },
  ], offlineOnlyReason),
  op('cdp_dataset', '数据输入', 'CDP 数据集', '读取 CDP 标签、画像或分群数据。', ['cdp', 'tag'], [], [tableOutput()], ['offline'], [
    { key: 'datasetId', label: 'CDP 数据集', control: 'select', required: true },
    { key: 'subjectId', label: '主体', control: 'select', required: true },
  ], offlineOnlyReason),
  op('custom_sql', '数据输入', '自定义 SQL', '通过查询语句生成输入节点，只允许 SELECT。', ['sql'], [], [tableOutput()], ['offline'], [
    { key: 'connectionId', label: 'SQL 数据连接', control: 'select', required: true },
    { key: 'sql', label: 'SQL', control: 'sql-editor', required: true, placeholder: 'select * from dwd.table where dt = ${bizDate}' },
    { key: 'timeoutSeconds', label: '超时时间（秒）', control: 'number', defaultValue: 60, min: 1, max: 600 },
  ], offlineOnlyReason),
  op('field_setting', '数据清洗', '字段设置', '保留、重命名、排序和转换字段类型。', ['rename', 'schema'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'fieldConfig', label: '字段列表', control: 'field-list', required: true },
  ]),
  op('join', '数据清洗', '连接', '配置多表 Join 关系，生成宽表。', ['join'], [tableInput('left'), tableInput('right')], [tableOutput()], ['offline'], [
    { key: 'joinType', label: '连接方式', control: 'select', required: true, defaultValue: 'left', options: [
      { label: 'inner', value: 'inner' },
      { label: 'left', value: 'left' },
      { label: 'right', value: 'right' },
      { label: 'full', value: 'full' },
    ] },
    { key: 'joinKeys', label: '连接字段', control: 'mapping-table', required: true },
    { key: 'conflictStrategy', label: '字段冲突处理', control: 'radio', required: true, defaultValue: 'prefix', options: [
      { label: '自动加前缀', value: 'prefix' },
      { label: '手动改名', value: 'manual' },
    ] },
  ], offlineOnlyReason),
  op('union_rows', '数据清洗', '合并行', '将多个结构相近的表纵向合并。', ['union'], [tableInput('input_1'), tableInput('input_2')], [tableOutput()], ['offline'], [
    { key: 'baseInput', label: '基准表', control: 'select', required: true },
    { key: 'fieldMappings', label: '字段匹配关系', control: 'mapping-table', required: true },
    { key: 'unmatchedStrategy', label: '未匹配字段处理', control: 'radio', required: true, defaultValue: 'fill_null', options: [
      { label: '补空输出', value: 'fill_null' },
      { label: '丢弃', value: 'drop' },
    ] },
  ], offlineOnlyReason),
  op('aggregate', '数据清洗', '聚合', '按分组字段统计 sum、count、avg 等指标。', ['group', 'sum', 'count'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'groupFields', label: '分组字段', control: 'multi-select' },
    { key: 'aggregateFields', label: '聚合字段', control: 'mapping-table', required: true },
  ]),
  op('calculated_column', '数据清洗', '计算列', '通过 Spark SQL 表达式新增或覆盖字段。', ['expression', 'spark'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'calculatedFields', label: '计算字段', control: 'mapping-table', required: true },
    { key: 'overwriteExisting', label: '允许覆盖原字段', control: 'switch', defaultValue: false },
  ]),
  op('filter_rows', '数据清洗', '筛选行', '保留符合条件的数据行。', ['where', 'filter'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'filterGroup', label: '条件组', control: 'condition-builder', required: true },
    { key: 'nullStrategy', label: '空值处理', control: 'radio', defaultValue: 'drop', options: [
      { label: '保留', value: 'keep' },
      { label: '过滤', value: 'drop' },
    ] },
  ]),
  op('unpivot', '数据清洗', '列转行', '将宽表转换为高表。', ['unpivot'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'reservedFields', label: '保留字段', control: 'multi-select', required: true },
    { key: 'pivotFields', label: '待转换字段', control: 'multi-select', required: true },
    { key: 'nameField', label: '名称字段名', control: 'input', required: true, defaultValue: 'field_name' },
    { key: 'valueField', label: '值字段名', control: 'input', required: true, defaultValue: 'field_value' },
  ], offlineOnlyReason),
  op('pivot', '数据清洗', '行转列', '将高表转换为宽表。', ['pivot'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'groupFields', label: '分组字段', control: 'multi-select', required: true },
    { key: 'pivotField', label: '转列字段', control: 'select', required: true },
    { key: 'valueField', label: '值字段', control: 'select', required: true },
    { key: 'aggFunc', label: '聚合方式', control: 'select', required: true, defaultValue: 'first', options: [
      { label: 'first', value: 'first' },
      { label: 'sum', value: 'sum' },
      { label: 'avg', value: 'avg' },
      { label: 'max', value: 'max' },
      { label: 'min', value: 'min' },
      { label: 'count', value: 'count' },
    ] },
  ], offlineOnlyReason),
  op('string_index', '数据清洗', '字符串索引', '将字符串类别字段映射为数值索引。', ['indexer'], [tableInput()], [tableOutput(), modelOutput('index_model')], ['offline'], [
    { key: 'inputFields', label: '输入字段', control: 'multi-select', required: true },
    { key: 'outputMode', label: '输出方式', control: 'radio', required: true, defaultValue: 'append', options: [
      { label: '替换原字段', value: 'replace' },
      { label: '新增字段', value: 'append' },
    ] },
    { key: 'suffix', label: '输出字段后缀', control: 'input', defaultValue: '_index' },
    { key: 'handleInvalid', label: '未见值处理', control: 'select', required: true, defaultValue: 'keep', options: [
      { label: 'error', value: 'error' },
      { label: 'keep', value: 'keep' },
      { label: 'skip', value: 'skip' },
    ] },
  ], offlineOnlyReason),
  op('missing_value', '数据清洗', '替换缺失值', '处理 null、空字符串、NaN 等缺失值。', ['null', 'fillna'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'inputFields', label: '处理字段', control: 'multi-select', required: true },
    { key: 'missingValues', label: '缺失值识别', control: 'multi-select', required: true, defaultValue: ['null', 'empty'], options: [
      { label: 'null', value: 'null' },
      { label: '空字符串', value: 'empty' },
      { label: 'NaN', value: 'nan' },
    ] },
    { key: 'fillStrategy', label: '替换方式', control: 'select', required: true, defaultValue: 'fixed', options: [
      { label: '固定值', value: 'fixed' },
      { label: '均值', value: 'mean' },
      { label: '中位数', value: 'median' },
      { label: '众数', value: 'mode' },
      { label: '前向填充', value: 'forward' },
      { label: '后向填充', value: 'backward' },
    ] },
    { key: 'fillValue', label: '替换值', control: 'input' },
  ]),
  op('sort', '数据清洗', '自由排序', '按一个或多个字段排序。', ['sort'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'sortFields', label: '排序字段', control: 'multi-select', required: true },
    { key: 'direction', label: '排序方向', control: 'select', required: true, defaultValue: 'DESC', options: [
      { label: 'ASC', value: 'ASC' },
      { label: 'DESC', value: 'DESC' },
    ] },
    { key: 'nullPosition', label: '空值位置', control: 'select', required: true, defaultValue: 'null_last', options: [
      { label: 'null first', value: 'null_first' },
      { label: 'null last', value: 'null_last' },
    ] },
  ], offlineOnlyReason),
  op('deduplicate', '数据清洗', '去重', '按字段组合去除重复数据。', ['distinct'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'dedupFields', label: '去重字段', control: 'multi-select', required: true },
    { key: 'keepRule', label: '保留规则', control: 'select', required: true, defaultValue: 'first', options: [
      { label: '保留第一条', value: 'first' },
      { label: '保留最后一条', value: 'last' },
      { label: '按排序字段保留', value: 'order' },
    ] },
  ]),
  op('split_field', '数据拆分', '拆分字段', '按分隔符或 JSON Path 拆出多个新字段。', ['jsonpath', 'split'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'sourceField', label: '原始字段', control: 'select', required: true },
    { key: 'splitMode', label: '拆分方式', control: 'radio', required: true, defaultValue: 'delimiter', options: [
      { label: '分隔符', value: 'delimiter' },
      { label: 'JSON Path', value: 'json_path' },
    ] },
    { key: 'delimiter', label: '分隔符', control: 'input', placeholder: ',' },
    { key: 'splitFields', label: '拆分字段配置', control: 'mapping-table', required: true },
    { key: 'keepSourceField', label: '保留原字段', control: 'switch', defaultValue: true },
  ]),
  op('data_split', '数据拆分', '数据拆分', '按比例或条件拆分为多个输出分支。', ['split', 'train test'], [tableInput()], [tableOutput('train'), tableOutput('test')], ['offline'], [
    { key: 'splitType', label: '拆分方式', control: 'radio', required: true, defaultValue: 'ratio', options: [
      { label: '按比例', value: 'ratio' },
      { label: '按条件', value: 'condition' },
    ] },
    { key: 'seed', label: '随机种子', control: 'number', defaultValue: 20260524 },
    { key: 'splitOutputs', label: '子集配置', control: 'mapping-table', required: true },
    { key: 'allowMultiMatch', label: '允许多路命中', control: 'switch', defaultValue: false },
  ], offlineOnlyReason),
  op('binarize', '特征工程', '二值化', '将数值字段转换为 0 / 1。', ['binary'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    ...commonTableTransformFields,
    { key: 'threshold', label: '二分类阈值', control: 'number', required: true, defaultValue: 0.5, min: 0 },
    { key: 'suffix', label: '输出列后缀', control: 'input', defaultValue: '_binary' },
  ]),
  op('pca', '特征工程', 'PCA 主成分分析', '对高维数值特征降维。', ['pca'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'featureColumns', label: '特征列', control: 'multi-select', required: true },
    { key: 'dimensionMode', label: '降维方式', control: 'select', required: true, defaultValue: 'keepVariance', options: [
      { label: '不降维', value: 'none' },
      { label: '固定数量', value: 'fixedNumber' },
      { label: '保留方差比例', value: 'keepVariance' },
    ] },
    { key: 'k', label: 'k 值', control: 'number', min: 1 },
    { key: 'variance', label: '方差保留比例', control: 'number', defaultValue: 0.99, min: 0, max: 1 },
    { key: 'outputPrefix', label: '输出字段前缀', control: 'input', required: true, defaultValue: 'pca_' },
  ], offlineOnlyReason),
  op('cartesian_product', '特征工程', '笛卡尔乘积', '生成数值特征之间的交叉组合。', ['cross'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'leftFields', label: '左操作数字段', control: 'multi-select', required: true },
    { key: 'rightFields', label: '右操作数字段', control: 'multi-select', required: true },
    { key: 'namingPattern', label: '输出字段命名规则', control: 'input', required: true, defaultValue: '{left}_{right}_cross' },
  ], offlineOnlyReason),
  op('dct', '特征工程', '离散余弦变换 DCT', '将数组型数值序列在时域与频域之间转换。', ['dct'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'arrayField', label: '输入数组字段', control: 'select', required: true },
    { key: 'direction', label: '变换方向', control: 'radio', required: true, defaultValue: 'forward', options: [
      { label: '正向', value: 'forward' },
      { label: '反向', value: 'inverse' },
    ] },
    { key: 'outputField', label: '输出字段名', control: 'input', required: true, defaultValue: 'dct_vector' },
    { key: 'keepCoefficients', label: '保留系数数量', control: 'number', min: 1 },
  ], offlineOnlyReason),
  op('row_normalize', '特征工程', '行归一化', '对每行多个数值字段组成的向量归一化。', ['normalize'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'featureColumns', label: '特征列', control: 'multi-select', required: true },
    { key: 'normType', label: '范数类型', control: 'select', required: true, defaultValue: 'l2', options: [
      { label: 'l1', value: 'l1' },
      { label: 'l2', value: 'l2' },
      { label: 'max', value: 'max' },
    ] },
    { key: 'replaceOriginal', label: '替换原字段', control: 'switch', defaultValue: false },
    { key: 'suffix', label: '输出字段后缀', control: 'input', defaultValue: '_norm' },
  ]),
  op('column_normalize', '特征工程', '列归一化', '对指定列做标准化、最小最大化或最大绝对值缩放。', ['standard scaler'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'featureColumns', label: '字段', control: 'multi-select', required: true },
    { key: 'scaleMode', label: '归一化方式', control: 'select', required: true, defaultValue: 'standard', options: [
      { label: 'standard', value: 'standard' },
      { label: 'minmax', value: 'minmax' },
      { label: 'maxabs', value: 'maxabs' },
    ] },
    { key: 'replaceOriginal', label: '替换原字段', control: 'switch', defaultValue: false },
    { key: 'suffix', label: '输出字段后缀', control: 'input', defaultValue: '_scaled' },
  ], offlineOnlyReason),
  op('svd', '特征工程', 'SVD 奇异值分解', '对数值矩阵降维。', ['svd'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'featureColumns', label: '特征列', control: 'multi-select', required: true },
    { key: 'k', label: '保留维度 k', control: 'number', required: true, defaultValue: 2, min: 1 },
    { key: 'outputPrefix', label: '输出字段前缀', control: 'input', required: true, defaultValue: 'svd_' },
  ], offlineOnlyReason),
  op('feature_hash', '特征工程', '特征哈希', '将高维稀疏特征映射到固定维度向量空间。', ['hashing'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'inputField', label: '输入字段', control: 'select', required: true },
    { key: 'hashDim', label: '哈希维度', control: 'number', required: true, defaultValue: 262144, min: 1 },
    { key: 'outputForm', label: '输出形式', control: 'radio', required: true, defaultValue: 'vector', options: [
      { label: 'vector', value: 'vector' },
      { label: '多列', value: 'columns' },
    ] },
    { key: 'outputField', label: '输出字段名', control: 'input', required: true, defaultValue: 'hashed_features' },
  ]),
  op('one_hot', '特征工程', 'One-hot 编码', '将离散分类变量转换为 0 / 1 字段或向量。', ['one-hot', 'onehot'], [tableInput()], [tableOutput(), modelOutput('onehot_model')], ['offline'], [
    { key: 'inputFields', label: '编码字段', control: 'multi-select', required: true },
    { key: 'outputForm', label: '输出方式', control: 'radio', required: true, defaultValue: 'vector', options: [
      { label: 'vector', value: 'vector' },
      { label: '多列', value: 'columns' },
    ] },
    { key: 'saveModel', label: '是否保存模型', control: 'switch', defaultValue: false },
    { key: 'modelName', label: '模型名称', control: 'input' },
    { key: 'handleInvalid', label: '未见值处理', control: 'select', required: true, defaultValue: 'keep', options: [
      { label: 'error', value: 'error' },
      { label: 'keep', value: 'keep' },
      { label: 'skip', value: 'skip' },
    ] },
    { key: 'outputPrefix', label: '输出字段前缀', control: 'input', required: true, defaultValue: 'onehot_' },
  ], offlineOnlyReason),
  op('array_process', '特征工程', 'Array 处理', '将数组转换为模型可用的向量结构。', ['array'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'arrayField', label: '输入数组字段', control: 'select', required: true },
    { key: 'processMode', label: '处理方式', control: 'select', required: true, defaultValue: 'auto_detect', options: [
      { label: 'auto_detect', value: 'auto_detect' },
      { label: 'to_vector', value: 'to_vector' },
      { label: 'explode', value: 'explode' },
      { label: 'index_encode', value: 'index_encode' },
    ] },
    { key: 'sampleRows', label: '采样数据行数', control: 'number', required: true, defaultValue: 200000, min: 1 },
    { key: 'outputField', label: '输出字段名', control: 'input', required: true, defaultValue: 'array_features' },
  ]),
  op('map_process', '特征工程', 'Map 处理', '处理 map<string,double> 类型稀疏特征。', ['map'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'mapField', label: 'Map 字段', control: 'select', required: true },
    { key: 'sampleRows', label: '采样数据行数', control: 'number', required: true, defaultValue: 200000, min: 1 },
    { key: 'keyMode', label: 'Key 处理方式', control: 'select', required: true, defaultValue: 'expand', options: [
      { label: 'expand', value: 'expand' },
      { label: 'vectorize', value: 'vectorize' },
      { label: 'filter_top_k', value: 'filter_top_k' },
    ] },
    { key: 'outputPrefix', label: '输出字段前缀', control: 'input', required: true, defaultValue: 'map_' },
  ], offlineOnlyReason),
  op('feature_importance', '特征工程', '特征重要性', '计算各特征对目标变量的重要性。', ['importance'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'featureColumns', label: '特征列', control: 'multi-select', required: true },
    { key: 'targetColumn', label: '目标列', control: 'select', required: true },
    { key: 'taskKind', label: '任务类型', control: 'select', required: true, defaultValue: 'classification', options: [
      { label: '分类', value: 'classification' },
      { label: '回归', value: 'regression' },
    ] },
    { key: 'method', label: '计算方法', control: 'select', required: true, defaultValue: 'random_forest', options: [
      { label: 'PCA', value: 'pca' },
      { label: 'Pearson', value: 'pearson' },
      { label: '卡方', value: 'chi_square' },
      { label: '信息增益', value: 'information_gain' },
      { label: '随机森林', value: 'random_forest' },
      { label: 'GBDT', value: 'gbdt' },
      { label: 'XGBoost', value: 'xgboost' },
    ] },
    { key: 'outputField', label: '输出字段名', control: 'input', required: true, defaultValue: 'importance_score' },
  ], offlineOnlyReason),
  op('feature_select', '特征工程', '特征筛选', '根据重要性结果筛选关键特征。', ['select k best'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'featureColumns', label: '特征列', control: 'multi-select', required: true },
    { key: 'targetColumn', label: '目标列', control: 'select', required: true },
    { key: 'selectMode', label: '筛选方式', control: 'select', required: true, defaultValue: 'top_k', options: [
      { label: '阈值', value: 'threshold' },
      { label: 'Top K', value: 'top_k' },
      { label: 'Top 百分比', value: 'top_percent' },
    ] },
    { key: 'threshold', label: '阈值', control: 'number' },
    { key: 'topK', label: 'Top K', control: 'number' },
    { key: 'topPercent', label: 'Top 百分比', control: 'number' },
  ], offlineOnlyReason),
  op('sentence_vector', '自然语言处理', '生成句向量', '根据词向量生成文本句向量。', ['embedding'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'inputColumn', label: '输入列', control: 'select', required: true },
    { key: 'embeddingSource', label: '词向量来源', control: 'radio', required: true, defaultValue: 'pretrained', options: [
      { label: '预训练', value: 'pretrained' },
      { label: '自定义输入', value: 'custom' },
    ] },
    { key: 'modelId', label: '词向量模型', control: 'select' },
    { key: 'outputColumn', label: '输出列', control: 'input', required: true, defaultValue: 'sentence_vector' },
  ], offlineOnlyReason),
  op('tokenize', '自然语言处理', '分词', '对中文文本进行分词。', ['nlp', 'token'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'inputColumn', label: '输入列', control: 'select', required: true },
    { key: 'mode', label: '分词模式', control: 'select', required: true, defaultValue: 'precise', options: [
      { label: '精确模式', value: 'precise' },
      { label: '全模式', value: 'full' },
      { label: '搜索模式', value: 'search' },
    ] },
    { key: 'outputColumn', label: '输出列', control: 'input', required: true, defaultValue: 'tokens' },
    { key: 'keepSourceField', label: '是否保留原字段', control: 'switch', defaultValue: true },
  ]),
  op('remove_stop_words', '自然语言处理', '移除停用词', '从分词结果中移除无意义词。', ['stopwords'], [tableInput()], [tableOutput()], ['offline', 'realtime'], [
    { key: 'inputColumn', label: '输入列', control: 'select', required: true },
    { key: 'stopWordList', label: '停用词表', control: 'select', required: true, defaultValue: 'system_default', options: [
      { label: '系统默认', value: 'system_default' },
      { label: '自定义上传', value: 'custom_upload' },
    ] },
    { key: 'outputColumn', label: '输出列', control: 'input', required: true, defaultValue: 'clean_tokens' },
  ]),
  op('classification', '机器学习', '分类训练', '训练逻辑回归、XGBoost、随机森林等分类模型。', ['logistic', 'xgboost', 'random forest'], [tableInput()], [tableOutput(), modelOutput()], ['offline'], [
    { key: 'modelName', label: '模型名称', control: 'input', required: true, placeholder: '客户意向度分类模型' },
    { key: 'modelType', label: '模型类型', control: 'select', required: true, defaultValue: 'logistic_regression', options: [
      { label: '逻辑回归', value: 'logistic_regression' },
      { label: 'XGBoost 分类', value: 'xgboost_classifier' },
      { label: 'CatBoost 分类', value: 'catboost_classifier' },
      { label: '决策树', value: 'decision_tree_classifier' },
      { label: '随机森林', value: 'random_forest_classifier' },
      { label: 'GBDT', value: 'gbdt_classifier' },
      { label: '朴素贝叶斯', value: 'naive_bayes' },
      { label: '线性 SVM', value: 'linear_svm' },
      { label: '多层感知机', value: 'multilayer_perceptron' },
    ] },
    { key: 'featureColumns', label: '特征列', control: 'multi-select', required: true },
    { key: 'labelColumn', label: '标签列', control: 'select', required: true },
    { key: 'trainRatio', label: '训练集比例', control: 'number', defaultValue: 0.8, min: 0, max: 1 },
    { key: 'threshold', label: '二分类阈值', control: 'number', defaultValue: 0.5, min: 0, max: 1 },
    { key: 'saveModel', label: '是否保存模型', control: 'switch', defaultValue: true },
    { key: 'predictionField', label: '输出预测字段名', control: 'input', required: true, defaultValue: 'prediction' },
    { key: 'maxIter', label: '最大迭代次数', control: 'number', defaultValue: 100, min: 1 },
    { key: 'regParam', label: '正则化参数', control: 'number', defaultValue: 0 },
  ], offlineOnlyReason),
  op('clustering', '机器学习', '聚类训练', '训练 KMeans、二分 KMeans、GMM 聚类模型。', ['kmeans'], [tableInput()], [tableOutput(), modelOutput()], ['offline'], [
    { key: 'modelType', label: '模型类型', control: 'select', required: true, defaultValue: 'kmeans', options: [
      { label: 'KMeans', value: 'kmeans' },
      { label: '二分 KMeans', value: 'bisecting_kmeans' },
      { label: '高斯混合', value: 'gaussian_mixture' },
    ] },
    { key: 'featureColumns', label: '特征列', control: 'multi-select', required: true },
    { key: 'k', label: '聚类簇数 k', control: 'number', required: true, defaultValue: 3, min: 2 },
    { key: 'maxIter', label: '最大迭代次数', control: 'number', required: true, defaultValue: 100, min: 1 },
    { key: 'seed', label: '随机种子', control: 'number' },
    { key: 'clusterField', label: '输出簇字段名', control: 'input', required: true, defaultValue: 'cluster_id' },
  ], offlineOnlyReason),
  op('regression', '机器学习', '回归训练', '训练线性回归、随机森林回归、XGBoost 回归等模型。', ['linear regression', 'xgboost'], [tableInput()], [tableOutput(), modelOutput()], ['offline'], [
    { key: 'modelType', label: '模型类型', control: 'select', required: true, defaultValue: 'linear_regression', options: [
      { label: '线性回归', value: 'linear_regression' },
      { label: '决策树回归', value: 'decision_tree_regression' },
      { label: '随机森林回归', value: 'random_forest_regression' },
      { label: 'XGBoost 回归', value: 'xgboost_regression' },
      { label: 'GBDT 回归', value: 'gbdt_regression' },
    ] },
    { key: 'featureColumns', label: '特征列', control: 'multi-select', required: true },
    { key: 'targetColumn', label: '目标列', control: 'select', required: true },
    { key: 'maxIter', label: '最大迭代次数', control: 'number', defaultValue: 100, min: 1 },
    { key: 'predictionField', label: '输出预测字段名', control: 'input', required: true, defaultValue: 'prediction' },
    { key: 'saveModel', label: '是否保存模型', control: 'switch', defaultValue: true },
  ], offlineOnlyReason),
  op('predict', '机器学习', '预测', '将上游训练模型应用到预测数据。', ['predict'], [modelInput(), tableInput('data')], [tableOutput()], ['offline'], [
    { key: 'modelSource', label: '模型来源', control: 'select', required: true },
    { key: 'featureMapping', label: '特征列映射', control: 'mapping-table', required: true },
    { key: 'predictionField', label: '预测字段名称', control: 'input', required: true, defaultValue: 'prediction' },
  ], offlineOnlyReason),
  op('model_file', '机器学习', '模型文件', '选择已训练模型文件进行预测。', ['model file'], [tableInput('data')], [tableOutput()], ['offline'], [
    { key: 'modelId', label: '模型信息', control: 'select', required: true },
    { key: 'featureMapping', label: '选择特征字段', control: 'mapping-table', required: true },
    { key: 'predictionField', label: '预测字段名称', control: 'input', required: true, defaultValue: 'prediction' },
  ], offlineOnlyReason),
  op('one_hot_model_apply', '机器学习', 'One-hot 模型应用', '复用 One-hot 编码模型处理新数据。', ['one-hot model'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'oneHotModelId', label: 'One-hot 模型', control: 'select', required: true },
    { key: 'featureMapping', label: '特征列映射', control: 'mapping-table', required: true },
    { key: 'handleInvalid', label: '未见值处理', control: 'select', required: true, defaultValue: 'keep', options: [
      { label: 'error', value: 'error' },
      { label: 'keep', value: 'keep' },
      { label: 'skip', value: 'skip' },
    ] },
    { key: 'outputPrefix', label: '输出字段前缀', control: 'input', required: true, defaultValue: 'onehot_' },
  ], offlineOnlyReason),
  op('binary_evaluation', '机器学习', '二分类评估', '输出 accuracy、precision、recall、f1、auc、混淆矩阵。', ['auc', 'roc'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'labelColumn', label: '真实标签列', control: 'select', required: true },
    { key: 'predictionColumn', label: '预测标签列', control: 'select', required: true },
    { key: 'probabilityColumn', label: '预测概率列', control: 'select' },
  ], offlineOnlyReason),
  op('multiclass_evaluation', '机器学习', '多分类评估', '输出 macro、weighted 等多分类指标。', ['evaluation'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'labelColumn', label: '真实标签列', control: 'select', required: true },
    { key: 'predictionColumn', label: '预测标签列', control: 'select', required: true },
  ], offlineOnlyReason),
  op('clustering_evaluation', '机器学习', '聚类评估', '输出轮廓系数、簇数量和簇分布。', ['silhouette'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'featureColumns', label: '特征列', control: 'multi-select', required: true },
    { key: 'clusterField', label: '簇字段', control: 'select', required: true },
  ], offlineOnlyReason),
  op('regression_evaluation', '机器学习', '回归评估', '输出 MAE、MSE、RMSE、R2 等指标。', ['rmse'], [tableInput()], [tableOutput()], ['offline'], [
    { key: 'labelColumn', label: '真实值列', control: 'select', required: true },
    { key: 'predictionColumn', label: '预测值列', control: 'select', required: true },
  ], offlineOnlyReason),
  op('dataset_output', '输出', '输出为数据集', '保存为平台数据集，供分析、仪表盘和建模复用。', ['dataset output'], [tableInput()], [], ['offline'], datasetOutputFields, offlineOnlyReason),
  op('external_output', '输出', '外部输出', '写入 ClickHouse、MaxCompute 等外部存储。', ['external', 'clickhouse'], [tableInput()], [], ['offline'], [
    { key: 'connectionId', label: '数据连接', control: 'select', required: true },
    { key: 'schemaName', label: '数据库 / Schema', control: 'select', required: true },
    { key: 'tableName', label: '输出表', control: 'input', required: true },
    { key: 'writeMode', label: '写入模式', control: 'select', required: true, defaultValue: 'append', options: [
      { label: '覆盖', value: 'overwrite' },
      { label: '追加', value: 'append' },
      { label: '分区覆盖', value: 'partition_overwrite' },
    ] },
    { key: 'fieldMapping', label: '字段映射', control: 'mapping-table', required: true },
  ], offlineOnlyReason),
  op('kafka_output', '输出', '输出到 Kafka', '将实时任务结果以 JSON 写入 Kafka Topic。', ['kafka'], [streamInput()], [], ['realtime'], [
    { key: 'connectionId', label: 'Kafka 数据连接', control: 'select', required: true },
    { key: 'topic', label: 'Topic', control: 'input', required: true },
    { key: 'format', label: '输出格式', control: 'input', defaultValue: 'JSON' },
    { key: 'dirtyDataEnabled', label: '脏数据采集', control: 'switch', defaultValue: true },
    { key: 'sampleRatePerSecond', label: '脏数据每秒采集条数', control: 'number', defaultValue: 100, min: 1 },
  ], realtimeOnlyReason),
  op('split_output', '输出', '分流输出', '按规则将实时流拆分成多条子流输出。', ['route', 'split stream'], [streamInput()], [], ['realtime'], [
    { key: 'rules', label: '分流规则列表', control: 'mapping-table', required: true },
    { key: 'allowMultiMatch', label: '允许多路命中', control: 'switch', defaultValue: false },
    { key: 'defaultStreamEnabled', label: '默认分流', control: 'switch', defaultValue: true },
  ], realtimeOnlyReason),
  op('realtime_label_output', '输出', '输出实时标签', '将实时流写入 CDP 实时标签。', ['tag', 'cdp'], [streamInput()], [], ['realtime'], [
    { key: 'subjectId', label: '主体', control: 'select', required: true },
    { key: 'idMappingType', label: 'ID-Mapping 类型', control: 'radio', required: true, defaultValue: 'convert', options: [
      { label: '实时转换', value: 'convert' },
      { label: '实时生成', value: 'generate' },
    ] },
    { key: 'idType', label: 'ID 类型', control: 'select', required: true },
    { key: 'idField', label: 'ID 类型字段', control: 'select', required: true },
    { key: 'tagField', label: '标签字段', control: 'select', required: true },
    { key: 'tagName', label: '标签名称', control: 'input', required: true },
    { key: 'tagDescription', label: '标签描述', control: 'textarea' },
    { key: 'onlineService', label: '在线服务', control: 'switch', defaultValue: false },
  ], '当前项目未购买 CDP 产品，无法使用输出实时标签'),
]

const runtimeConfig = (queueId = 'queue_001'): RuntimeConfig => {
  const queue = visualModelingQueues.find((item) => item.id === queueId) ?? visualModelingQueues[0]
  return {
    resourceQueueId: queue?.id ?? 'queue_001',
    resourceQueueName: queue?.name ?? '默认队列',
    parallelismDefault: queueId === 'queue_realtime' ? 8 : 4,
    taskManagerMemory: queueId === 'queue_ml' ? '8g' : '4g',
    jobManagerMemory: '2g',
    taskSlots: 4,
    yarnVcores: 2,
    dirtyDataConfig: { enabled: true, sampleRatePerSecond: 100 },
  }
}

export function getOperator(type: OperatorType): OperatorDefinition {
  const definition = visualModelingOperators.find((item) => item.type === type)
  if (!definition) {
    throw new Error(`未知算子：${type}`)
  }
  return definition
}

export function createMockNode(
  type: OperatorType,
  id: string,
  x: number,
  y: number,
  config: Record<string, unknown> = {},
  schema?: DatasetSchema,
): ModelingNode {
  const definition = getOperator(type)
  const defaults = Object.fromEntries(
    definition.configFields
      .filter((field) => field.defaultValue !== undefined)
      .map((field) => [field.key, field.defaultValue]),
  )
  return {
    id,
    type,
    category: definition.category,
    name: definition.name,
    displayName: String(config.displayName ?? definition.name),
    x,
    y,
    width: 220,
    height: 104,
    inputPorts: definition.inputPorts.map((port) => ({ ...port })),
    outputPorts: definition.outputPorts.map((port) => ({ ...port })),
    config: { ...defaults, ...config },
    schema,
    previewStatus: schema ? 'ready' : 'empty',
    validationStatus: 'unknown',
    validationErrors: [],
  }
}

const edge = (sourceNodeId: string, targetNodeId: string, sourcePortId = 'output', targetPortId = 'input'): ModelingEdge => ({
  id: `edge_${sourceNodeId}_${targetNodeId}_${sourcePortId}_${targetPortId}`,
  sourceNodeId,
  sourcePortId,
  targetNodeId,
  targetPortId,
})

const offlineNodes = [
  createMockNode('connection_table', 'node_input_event', 90, 150, {
    displayName: '广告观看明细',
    connectionId: 'conn_clickhouse_ad',
    databaseName: 'dwd',
    tableName: 'dwd_user_event_di',
    extractMode: 'partition',
    previewLimit: 100,
  }, sampleSchemas.event!),
  createMockNode('missing_value', 'node_missing', 340, 150, {
    displayName: '填充缺失收益',
    inputFields: ['revenue', 'coin_balance'],
    missingValues: ['null', 'nan'],
    fillStrategy: 'fixed',
    fillValue: 0,
  }, sampleSchemas.event!),
  createMockNode('calculated_column', 'node_calc', 590, 150, {
    displayName: '计算价值特征',
    calculatedFields: [
      { source: 'revenue', target: 'revenue_score', expression: 'coalesce(revenue, 0) * 100' },
      { source: 'coin_balance', target: 'low_coin_flag', expression: 'case when coin_balance < 100 then 1 else 0 end' },
    ],
    overwriteExisting: false,
  }, {
    ...sampleSchemas.event!,
    fields: [
      ...sampleSchemas.event!.fields,
      field('revenue_score', '收益分', 'double'),
      field('low_coin_flag', '低金币标识', 'int'),
    ],
  }),
  createMockNode('classification', 'node_train', 840, 150, {
    displayName: '意向度分类训练',
    modelName: '客户意向度分类模型',
    modelType: 'logistic_regression',
    featureColumns: ['revenue_score', 'low_coin_flag', 'coin_balance'],
    labelColumn: 'is_paid',
    trainRatio: 0.8,
    threshold: 0.5,
    saveModel: true,
    predictionField: 'prediction',
    maxIter: 100,
    regParam: 0,
  }, sampleSchemas.modelOutput!),
  createMockNode('binary_evaluation', 'node_eval', 1090, 150, {
    displayName: '二分类评估',
    labelColumn: 'is_paid',
    predictionColumn: 'prediction',
    probabilityColumn: 'prediction_probability',
  }, sampleSchemas.modelOutput!),
  createMockNode('dataset_output', 'node_output_dataset', 1340, 150, {
    displayName: '输出预测数据集',
    outputMode: 'create',
    datasetName: '客户意向度预测结果',
    folderId: 'folder_ml',
    writeMode: 'partition_overwrite',
    partitionField: 'event_date',
    datasetDescription: '用于后续人群圈选与触达策略。',
    autoPartitionProbe: true,
    partitionExpression: '${bizDate}',
  }, sampleSchemas.modelOutput!),
]

const realtimeNodes = [
  createMockNode('connection_table', 'node_stream_input', 100, 180, {
    displayName: '实时行为 Topic',
    connectionId: 'conn_kafka_behavior',
    databaseName: 'topic',
    tableName: 'user_behavior_event',
    extractMode: 'incremental',
    previewLimit: 100,
  }, sampleSchemas.stream!),
  createMockNode('split_field', 'node_parse_event', 360, 180, {
    displayName: '解析事件 JSON',
    sourceField: 'event',
    splitMode: 'json_path',
    splitFields: [
      { source: 'event.event_name', target: 'event_name', type: 'string' },
      { source: 'event.amount', target: 'amount', type: 'double' },
    ],
    keepSourceField: true,
  }, {
    ...sampleSchemas.stream!,
    fields: [...sampleSchemas.stream!.fields, field('event_name', '事件名称', 'string'), field('amount', '金额', 'double')],
  }),
  createMockNode('filter_rows', 'node_filter_realtime', 620, 180, {
    displayName: '过滤付费事件',
    filterGroup: { relation: 'AND', conditions: [{ field: 'event_name', operator: '=', value: 'pay_success' }] },
    nullStrategy: 'drop',
  }, {
    ...sampleSchemas.stream!,
    fields: [...sampleSchemas.stream!.fields, field('event_name', '事件名称', 'string'), field('amount', '金额', 'double')],
  }),
  createMockNode('split_output', 'node_split_output', 900, 92, {
    displayName: '分流实时子流',
    rules: [
      { name: '高价值用户', condition: 'amount >= 100', target: 'topic.high_value_pay' },
      { name: '普通付费用户', condition: 'amount < 100', target: 'topic.normal_pay' },
    ],
    allowMultiMatch: false,
    defaultStreamEnabled: true,
  }),
  createMockNode('kafka_output', 'node_kafka_output', 900, 275, {
    displayName: '写入 Kafka',
    connectionId: 'conn_kafka_behavior',
    topic: 'realtime_pay_success',
    format: 'JSON',
    dirtyDataEnabled: true,
    sampleRatePerSecond: 100,
  }),
]

export const mockVisualModelingTasks: VisualModelingTask[] = [
  {
    id: 'task_intent_prediction',
    projectId: 'project_demo',
    name: '客户意向度预测建模',
    description: '从广告观看、金币余额和付费标签中训练客户转化倾向模型，并输出预测数据集。',
    taskType: 'offline',
    ownerId: 'current_user',
    ownerName: 'Chaoyang Xu',
    folderId: 'folder_ml',
    folderName: '机器学习',
    status: 'published',
    runMode: 'schedule',
    scheduleConfig: { frequency: 'daily', time: '02:30', dependencyStrategy: 'all_success' },
    dag: {
      nodes: offlineNodes,
      edges: [
        edge('node_input_event', 'node_missing'),
        edge('node_missing', 'node_calc'),
        edge('node_calc', 'node_train'),
        edge('node_train', 'node_eval'),
        edge('node_eval', 'node_output_dataset'),
      ],
      canvas: { scale: 1, offsetX: 0, offsetY: 0 },
    },
    runtimeConfig: runtimeConfig('queue_ml'),
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-18 09:30:00',
    updatedBy: 'Chaoyang Xu',
    updatedAt: '2026-05-23 19:12:00',
    lastRunAt: '2026-05-24 02:34:18',
    lastRunStatus: 'success',
    version: 8,
  },
  {
    id: 'task_realtime_pay_stream',
    projectId: 'project_demo',
    name: '实时付费行为分流',
    description: '实时消费 Kafka 行为流，解析事件并按付费金额拆分到不同 Topic。',
    taskType: 'realtime',
    ownerId: 'current_user',
    ownerName: 'Chaoyang Xu',
    folderId: 'folder_realtime',
    folderName: '实时链路',
    status: 'running',
    runMode: 'manual',
    dag: {
      nodes: realtimeNodes,
      edges: [
        edge('node_stream_input', 'node_parse_event'),
        edge('node_parse_event', 'node_filter_realtime'),
        edge('node_filter_realtime', 'node_split_output'),
        edge('node_filter_realtime', 'node_kafka_output'),
      ],
      canvas: { scale: 1, offsetX: 0, offsetY: 0 },
    },
    runtimeConfig: runtimeConfig('queue_realtime'),
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-20 14:10:00',
    updatedBy: 'Mia Chen',
    updatedAt: '2026-05-24 09:05:00',
    lastRunAt: '2026-05-24 09:08:14',
    lastRunStatus: 'running',
    version: 3,
  },
  {
    id: 'task_dirty_user_profile',
    projectId: 'project_demo',
    name: '会员画像清洗任务',
    description: '清洗会员中心用户属性数据，产出画像基础表。',
    taskType: 'offline',
    ownerId: 'user_mia',
    ownerName: 'Mia Chen',
    folderId: 'folder_growth',
    folderName: '增长分析',
    status: 'saved',
    runMode: 'manual',
    dag: {
      nodes: [
        createMockNode('visual_modeling_dataset', 'node_profile_input', 120, 170, {
          displayName: '会员画像基础数据集',
          datasetId: 'ds_member_profile',
        }, sampleSchemas.event!),
        createMockNode('field_setting', 'node_field_setting', 410, 170, {
          displayName: '字段标准化',
          fieldConfig: [
            { source: 'user_id', target: 'user_id', keep: true, type: 'string' },
            { source: 'coin_balance', target: 'coin_balance', keep: true, type: 'int' },
          ],
        }, sampleSchemas.event!),
        createMockNode('dataset_output', 'node_profile_output', 700, 170, {
          displayName: '输出画像宽表',
          datasetName: '会员画像清洗结果',
          folderId: 'folder_growth',
          writeMode: 'overwrite',
        }, sampleSchemas.event!),
      ],
      edges: [edge('node_profile_input', 'node_field_setting'), edge('node_field_setting', 'node_profile_output')],
      canvas: { scale: 1, offsetX: 0, offsetY: 0 },
    },
    runtimeConfig: runtimeConfig(),
    createdBy: 'Mia Chen',
    createdAt: '2026-05-16 10:45:00',
    updatedBy: 'Mia Chen',
    updatedAt: '2026-05-22 18:20:00',
    version: 2,
  },
  {
    id: 'task_legacy_ad_export',
    projectId: 'project_demo',
    name: '旧版投放日报整理',
    description: '已下线的投放日报清洗流程。',
    taskType: 'offline',
    ownerId: 'current_user',
    ownerName: 'Chaoyang Xu',
    folderId: 'folder_growth',
    folderName: '增长分析',
    status: 'deleted',
    runMode: 'manual',
    dag: {
      nodes: [
        createMockNode('connection_table', 'node_legacy_input', 120, 160, {
          displayName: '投放日报 CSV',
          connectionId: 'conn_clickhouse_ad',
          databaseName: 'oss',
          tableName: 'ad_cost_daily.csv',
        }, sampleSchemas.payment!),
        createMockNode('dataset_output', 'node_legacy_output', 430, 160, {
          displayName: '输出日报',
          datasetName: '旧版投放日报',
          folderId: 'folder_growth',
          writeMode: 'overwrite',
        }, sampleSchemas.payment!),
      ],
      edges: [edge('node_legacy_input', 'node_legacy_output')],
      canvas: { scale: 1, offsetX: 0, offsetY: 0 },
    },
    runtimeConfig: runtimeConfig(),
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-04-28 12:10:00',
    updatedBy: 'Chaoyang Xu',
    updatedAt: '2026-05-10 17:10:00',
    lastRunAt: '2026-05-11 01:20:00',
    lastRunStatus: 'failed',
    deletedBy: 'Chaoyang Xu',
    deletedAt: '2026-05-22 16:00:00',
    expireDeleteAt: '2026-06-06 16:00:00',
    version: 4,
  },
]

export const mockVisualModelingRuns: TaskRunRecord[] = [
  {
    id: 'run_intent_20260524',
    taskId: 'task_intent_prediction',
    businessDate: '2026-05-24',
    runType: 'schedule',
    status: 'success',
    startedAt: '2026-05-24 02:30:00',
    finishedAt: '2026-05-24 02:34:18',
    durationSeconds: 258,
    outputRecords: [
      {
        outputNodeId: 'node_output_dataset',
        outputName: '客户意向度预测结果',
        status: 'success',
        writtenRows: 9824300,
        dirtyRows: 12,
      },
    ],
    createdBy: '系统调度',
    remark: '周期运行',
    logLines: [
      '[02:30:00] DAG 校验通过，生成 6 个执行阶段。',
      '[02:31:46] 训练逻辑回归模型，AUC=0.873。',
      '[02:34:18] 输出数据集写入完成，脏数据 12 条。',
    ],
  },
  {
    id: 'run_intent_20260523',
    taskId: 'task_intent_prediction',
    businessDate: '2026-05-23',
    runType: 'schedule',
    status: 'failed',
    startedAt: '2026-05-23 02:30:00',
    finishedAt: '2026-05-23 02:32:12',
    durationSeconds: 132,
    outputRecords: [
      {
        outputNodeId: 'node_output_dataset',
        outputName: '客户意向度预测结果',
        status: 'failed',
        writtenRows: 0,
        dirtyRows: 0,
        errorMessage: '上游分区 dwd_user_event_di/event_date=2026-05-23 未就绪。',
      },
    ],
    errorMessage: '等待依赖超时。',
    createdBy: '系统调度',
    logLines: [
      '[02:30:00] 开始检查上游分区依赖。',
      '[02:32:12] 上游分区未就绪，任务失败。',
    ],
  },
  {
    id: 'run_realtime_20260524',
    taskId: 'task_realtime_pay_stream',
    businessDate: '2026-05-24',
    runType: 'manual',
    status: 'running',
    startedAt: '2026-05-24 09:08:14',
    outputRecords: [
      {
        outputNodeId: 'node_split_output',
        outputName: '分流实时子流',
        status: 'running',
        writtenRows: 128530,
        dirtyRows: 21,
      },
      {
        outputNodeId: 'node_kafka_output',
        outputName: 'realtime_pay_success',
        status: 'running',
        writtenRows: 128530,
        dirtyRows: 21,
      },
    ],
    createdBy: 'Chaoyang Xu',
    remark: '上线后持续运行',
    logLines: [
      '[09:08:14] Flink 作业已启动。',
      '[09:08:45] Kafka 消费延迟 1.2s，写入正常。',
      '[09:12:00] 脏数据采样开启，每秒最多 100 条。',
    ],
  },
]

export const mockPreviewResults: Record<string, PreviewResult> = {
  default: {
    fields: sampleSchemas.event!.fields,
    rows: [
      {
        user_id: 'u_10001',
        event_name: 'ad_watch_finish',
        event_time: '2026-05-24 10:01:22',
        ad_position: '激励视频',
        game_type: '消除',
        revenue: 0.14,
        coin_balance: 86,
        is_paid: false,
      },
      {
        user_id: 'u_10002',
        event_name: 'pay_success',
        event_time: '2026-05-24 10:02:51',
        ad_position: '插屏',
        game_type: '经营',
        revenue: 0.06,
        coin_balance: 1200,
        is_paid: true,
      },
    ],
    logs: [
      { time: '10:18:12', level: 'INFO', content: '读取上游样本 100 行。' },
      { time: '10:18:13', level: 'INFO', content: '字段结构推导完成。' },
    ],
  },
  eval: {
    fields: sampleSchemas.modelOutput!.fields,
    rows: [
      { user_id: 'u_10001', prediction: 0, prediction_probability: 0.18 },
      { user_id: 'u_10002', prediction: 1, prediction_probability: 0.91 },
    ],
    metrics: {
      accuracy: 0.91,
      precision: 0.88,
      recall: 0.86,
      f1: 0.87,
      auc: 0.873,
    },
    confusionMatrix: [
      { actual: '0', predicted: '0', count: 42890 },
      { actual: '0', predicted: '1', count: 3180 },
      { actual: '1', predicted: '0', count: 4210 },
      { actual: '1', predicted: '1', count: 27430 },
    ],
    logs: [
      { time: '10:20:12', level: 'INFO', content: '完成二分类评估。' },
      { time: '10:20:13', level: 'INFO', content: 'AUC=0.873，F1=0.87。' },
    ],
  },
  stream: {
    fields: sampleSchemas.stream!.fields,
    rows: [
      {
        user_id: 'u_20001',
        event: '{"event_name":"pay_success","amount":128}',
        event_time: '2026-05-24 10:21:01',
        partition_id: 3,
        offset: 1820921,
      },
      {
        user_id: 'u_20002',
        event: '{"event_name":"ad_watch_finish","amount":0}',
        event_time: '2026-05-24 10:21:03',
        partition_id: 7,
        offset: 1820928,
      },
    ],
    logs: [
      { time: '10:21:12', level: 'INFO', content: '采样 Kafka Topic 最近 100 条消息。' },
      { time: '10:21:13', level: 'WARN', content: '存在 2 条 JSON 字段缺失，已进入脏数据采样。' },
    ],
  },
}

export const mockExportResources: ExportResource[] = [
  {
    taskId: 'task_intent_prediction',
    taskName: '客户意向度预测建模',
    ownerName: 'Chaoyang Xu',
    folderPath: '/机器学习',
    createdAt: '2026-05-18 09:30:00',
    inputDatasets: ['广告观看明细数据集'],
    outputDatasets: ['客户意向度预测结果'],
    dataConnections: ['行为数仓 ClickHouse'],
    resourceQueues: ['机器学习高内存队列'],
    canExportOutputDataset: true,
  },
  {
    taskId: 'task_dirty_user_profile',
    taskName: '会员画像清洗任务',
    ownerName: 'Mia Chen',
    folderPath: '/增长分析',
    createdAt: '2026-05-16 10:45:00',
    inputDatasets: ['会员画像基础数据集'],
    outputDatasets: ['会员画像清洗结果'],
    dataConnections: ['会员中心 MySQL'],
    resourceQueues: ['默认队列'],
    canExportOutputDataset: false,
  },
]

export const mockImportParseResult: ImportParseResult = {
  importId: 'import_demo_001',
  packageName: '可视化建模_20260524_A9K2.prep',
  tasks: [
    { id: 'pkg_task_1', name: '客户意向度预测建模', mode: 'create_new', valid: true },
    { id: 'pkg_task_2', name: '会员画像清洗任务', mode: 'overwrite', valid: true },
  ],
  inputDatasets: [
    { sourceName: '广告观看明细数据集', targetDatasetId: 'ds_ad_watch_detail', compatible: true },
    { sourceName: '会员画像基础数据集', targetDatasetId: 'ds_member_profile', compatible: true },
  ],
  outputDatasets: [
    { sourceName: '客户意向度预测结果', importAction: 'create', targetName: '客户意向度预测结果_迁移' },
    { sourceName: '会员画像清洗结果', importAction: 'map_existing', targetName: '会员画像清洗结果' },
  ],
  dataConnections: [
    { sourceName: '行为数仓 ClickHouse', targetConnectionId: 'conn_clickhouse_ad', compatible: true },
    { sourceName: '会员中心 MySQL', targetConnectionId: 'conn_mysql_member', compatible: true },
  ],
  resourceQueues: [
    { sourceName: '机器学习高内存队列', targetQueueId: 'queue_ml' },
    { sourceName: '默认队列', targetQueueId: 'queue_001' },
  ],
}
