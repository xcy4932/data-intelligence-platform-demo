import type {
  TagCategory,
  TagDefinition,
  TagLineageNode,
  TagMetadataField,
  TagOperationLog,
  TagPermission,
  TagPermissionSet,
  TagRuleConfig,
  TagRuleVersion,
  TagRunRecord,
  TagTemplate,
  TagValueAssessment,
  TagValueDistribution,
  TagHistoryPoint,
  TagType,
  TagValueType,
} from '@/types/tag'
import type { Owner } from '@/types/common'

const ownerInsight: Owner = { id: 'owner-user-insight', name: '许澄', department: '用户洞察团队' }
const ownerGrowth: Owner = { id: 'owner-growth', name: '林哲', department: '增长运营团队' }
const ownerData: Owner = { id: 'owner-data', name: '周然', department: '数据平台团队' }
const ownerAdmin: Owner = { id: 'owner-admin', name: '孟澜', department: '平台管理组' }

export const currentTagPermissions: TagPermissionSet = {
  viewTagSystem: true,
  createTag: true,
  createTypes: [
    'rule',
    'statistic',
    'first_last',
    'preference',
    'priority',
    'calculation',
    'lifecycle',
    'rfm',
    'import',
    'manual',
    'sql',
    'model',
  ],
  editTagTree: true,
  viewTagTask: true,
  shelveTag: true,
  tagView: true,
  tagEdit: true,
  tagManage: true,
  runTag: true,
  projectAdmin: true,
  sqlPrivateDeployment: true,
  realtimeEnabled: true,
  templateEnabled: true,
}

export const tagCategories: TagCategory[] = [
  { id: 'cat-root', parentId: null, name: '全部标签', level: 1, sort: 1, tagCount: 12, system: true, canEdit: false },
  { id: 'cat-uncategorized', parentId: 'cat-root', name: '未分类', level: 2, sort: 1, tagCount: 1, system: true, canEdit: false },
  { id: 'cat-profile', parentId: 'cat-root', name: '基础画像', level: 2, sort: 2, tagCount: 3, system: false, canEdit: true },
  { id: 'cat-behavior', parentId: 'cat-root', name: '行为偏好', level: 2, sort: 3, tagCount: 4, system: false, canEdit: true },
  { id: 'cat-value', parentId: 'cat-root', name: '价值分层', level: 2, sort: 4, tagCount: 3, system: false, canEdit: true },
  { id: 'cat-import', parentId: 'cat-root', name: '外部导入', level: 2, sort: 5, tagCount: 2, system: false, canEdit: true },
  { id: 'cat-lifecycle', parentId: 'cat-value', name: '生命周期', level: 3, sort: 1, tagCount: 2, system: false, canEdit: true },
]

export const tagMetadataFields: TagMetadataField[] = [
  {
    id: 'meta-owner',
    projectId: 'project-demo',
    name: '业务负责人',
    dataType: 'text',
    required: true,
    enumValues: [],
    quickFilterEnabled: false,
    description: '负责解释标签业务口径的人',
    createdBy: '孟澜',
    createdAt: '2026-05-01T09:00:00+02:00',
    status: 'enabled',
  },
  {
    id: 'meta-source',
    projectId: 'project-demo',
    name: '口径来源',
    dataType: 'single_select',
    required: true,
    enumValues: ['运营定义', '数据模型', '外部系统', '行业模板'],
    quickFilterEnabled: true,
    description: '用于下游圈选快捷筛选',
    createdBy: '孟澜',
    createdAt: '2026-05-01T09:05:00+02:00',
    status: 'enabled',
  },
  {
    id: 'meta-sensitive',
    projectId: 'project-demo',
    name: '敏感等级',
    dataType: 'single_select',
    required: true,
    enumValues: ['公开', '内部', '敏感', '高度敏感'],
    quickFilterEnabled: true,
    description: '控制下游展示和导出范围',
    createdBy: '孟澜',
    createdAt: '2026-05-01T09:10:00+02:00',
    status: 'enabled',
  },
  {
    id: 'meta-channel',
    projectId: 'project-demo',
    name: '适用渠道',
    dataType: 'multi_select',
    required: false,
    enumValues: ['站内触达', '短信', 'Push', '外呼', 'API'],
    quickFilterEnabled: true,
    description: '最多 3 个快捷筛选条件之一',
    createdBy: '孟澜',
    createdAt: '2026-05-01T09:15:00+02:00',
    status: 'enabled',
  },
]

const baseRule = (type: TagType, summary: string): TagRuleConfig => ({
  type,
  summary,
  values: [
    {
      id: 'value-high',
      name: '高意向',
      priority: 1,
      include: {
        id: 'include-high',
        logic: 'and',
        conditions: [
          {
            id: 'cond-behavior',
            sourceType: 'behavior',
            sourceName: '行为数据',
            field: '最近 7 天浏览商品详情页',
            operator: '大于等于',
            value: '3 次',
            dateRange: '最近 7 天，包含今天',
          },
          {
            id: 'cond-attr',
            sourceType: 'attribute',
            sourceName: '用户属性',
            field: '城市',
            operator: '不为空',
            value: '有值',
          },
        ],
      },
      exclude: {
        id: 'exclude-high',
        logic: 'or',
        conditions: [
          {
            id: 'cond-exclude',
            sourceType: 'tag',
            sourceName: '历史标签',
            field: '黑名单用户',
            operator: '等于',
            value: '是',
          },
        ],
      },
    },
    {
      id: 'value-medium',
      name: '中意向',
      priority: 2,
      include: {
        id: 'include-medium',
        logic: 'and',
        conditions: [
          {
            id: 'cond-medium',
            sourceType: 'behavior',
            sourceName: '行为数据',
            field: '最近 30 天访问活动页',
            operator: '大于',
            value: '0 次',
            dateRange: '最近 30 天，不包含今天',
          },
        ],
      },
      exclude: { id: 'exclude-medium', logic: 'or', conditions: [] },
    },
  ],
})

const tag = (
  id: string,
  name: string,
  type: TagType,
  valueType: TagValueType,
  categoryId: string,
  overrides: Partial<TagDefinition> = {},
): TagDefinition => ({
  id,
  projectId: 'project-demo',
  subjectId: 'subject-user',
  subjectName: '用户主体',
  name,
  description: `${name}用于用户分群、画像洞察和营销触达。`,
  type,
  valueType,
  categoryId,
  status: 'online',
  computeType: 'offline',
  updateType: 'scheduled',
  frequency: { unit: 'day', time: '08:00' },
  emptyValueStrategy: 'empty',
  ttl: { strategy: 'system', unit: 'day' },
  onlineServiceEnabled: false,
  valueSaveMode: valueType.startsWith('multi') ? 'multi' : 'single',
  metadata: {
    'meta-owner': '用户洞察团队',
    'meta-source': type === 'model' ? '数据模型' : type === 'import' ? '外部系统' : '运营定义',
    'meta-sensitive': '内部',
    'meta-channel': ['站内触达', 'Push'],
  },
  rule: baseRule(type, `${name}按 PRD 口径配置规则，支持预估、运行记录和详情展示。`),
  createdBy: ownerInsight,
  createdAt: '2026-05-03T10:00:00+02:00',
  updatedAt: '2026-05-25T16:30:00+02:00',
  latestDataDate: '2026-05-25',
  latestDurationMs: 182000,
  resourceAdmins: [ownerAdmin, ownerData],
  permissions: { canView: true, canEdit: true, canManage: true, canShelve: true, canRun: true },
  favorite: false,
  visible: true,
  fromTemplate: false,
  downstreamDependencyCount: 2,
  syncedProjectIds: [],
  ...overrides,
})

export const tagDefinitions: TagDefinition[] = [
  tag('tag-rule-intent', '购车高意向人群', 'rule', 'text', 'cat-behavior', {
    favorite: true,
    onlineServiceEnabled: true,
    rule: baseRule('rule', '基于浏览车型、留资、到店行为配置高/中意向标签值，排除黑名单用户。'),
  }),
  tag('tag-stat-active-days', '近 30 日活跃天数', 'statistic', 'integer', 'cat-behavior', {
    rule: {
      type: 'statistic',
      summary: '统计近 30 天 App 启动事件发生天数，并按主体 ID 输出整数标签值。',
      dataSource: '行为事件表',
      statisticMethod: '天数',
      displayMode: 'raw',
    },
  }),
  tag('tag-first-test-drive', '首次试驾距今天数', 'first_last', 'integer', 'cat-behavior', {
    rule: {
      type: 'first_last',
      summary: '在试驾事件中按发生时间升序取第一条记录，输出距离业务日期的天数。',
      dataSource: '行为事件表',
      outputFeature: '距离今天的天数',
    },
  }),
  tag('tag-preference-series', '偏好车系 Top3', 'preference', 'multi_text', 'cat-behavior', {
    rule: {
      type: 'preference',
      summary: '按主体和车系分组，依据浏览次数排序取 Top 3 作为多值标签。',
      dataSource: '行为事件表',
      statisticMethod: '出现次数最多',
    },
  }),
  tag('tag-priority-gender', '性别优先取值', 'priority', 'text', 'cat-profile', {
    rule: {
      type: 'priority',
      summary: '优先取人工性别，其次取模型推断性别，最后取注册资料性别。',
      selectedFields: [
        { id: 'manual_gender', name: '性别-人工', valueType: 'text' },
        { id: 'model_gender', name: '性别-推断', valueType: 'text' },
        { id: 'profile_gender', name: '性别-注册资料', valueType: 'text' },
      ],
    },
  }),
  tag('tag-calc-credit-ratio', '授信使用率', 'calculation', 'decimal', 'cat-value', {
    rule: {
      type: 'calculation',
      summary: '动用金额 / 授信额度，空值丢弃，按数值区间展示低/中/高使用率。',
      selectedFields: [
        { id: 'used_credit', name: '动用金额', valueType: 'decimal' },
        { id: 'credit_limit', name: '授信额度', valueType: 'decimal' },
      ],
      expression: 'used_credit / credit_limit',
      emptyHandling: 'discard',
      displayMode: 'range',
      intervals: [
        { id: 'low', name: '低使用率', min: 0, max: 0.3 },
        { id: 'medium', name: '中使用率', min: 0.3, max: 0.7 },
        { id: 'high', name: '高使用率', min: 0.7 },
      ],
    },
  }),
  tag('tag-life-auto', '汽车生命周期阶段', 'lifecycle', 'text', 'cat-lifecycle', {
    fromTemplate: true,
    rule: {
      type: 'lifecycle',
      summary: '汽车行业生命周期模板：广告、留资、到店、试驾、下订、交车。',
      lifecycleModel: 'custom',
      values: baseRule('lifecycle', '生命周期阶段规则').values,
    },
  }),
  tag('tag-rfm-value', 'RFM 用户价值类型', 'rfm', 'text', 'cat-value', {
    rule: {
      type: 'rfm',
      summary: '基于最近消费距今天数、购买频率、消费金额生成用户价值类型。',
      dataSource: '明细数据',
      rfmMetrics: [
        { key: 'R', enabled: true, threshold: '小于等于平均值为高' },
        { key: 'F', enabled: true, threshold: '大于平均值为高' },
        { key: 'M', enabled: true, threshold: '大于平均值为高' },
      ],
    },
  }),
  tag('tag-import-member-level', '会员等级导入标签', 'import', 'text', 'cat-import', {
    updateType: 'scheduled',
    rule: {
      type: 'import',
      summary: '从会员主数据表选择 level 字段直接生成标签，同步周期跟随数据集。',
      dataSource: '会员主数据表',
    },
  }),
  tag('tag-manual-service-note', '客服意向人工标签', 'manual', 'text', 'cat-import', {
    status: 'offline',
    updateType: 'manual',
    ttl: { strategy: 'system' },
    rule: {
      type: 'manual',
      summary: '通过 CSV/XLSX 上传用户 ID 与标签值，支持覆盖和移除。',
      uploadMode: 'cover',
    },
  }),
  tag('tag-sql-high-value', 'SQL 高价值客户', 'sql', 'text', 'cat-value', {
    computeType: 'offline',
    rule: {
      type: 'sql',
      summary: '使用私有化环境 SQL 返回主体 ID 与标签值字段。',
      sql: "select user_id, '高价值' as tag_value from cdp.orders where amount >= 5000",
    },
  }),
  tag('tag-model-churn-risk', '流失风险预测', 'model', 'decimal', 'cat-uncategorized', {
    status: 'draft',
    updateType: 'manual',
    createdBy: ownerData,
    rule: {
      type: 'model',
      summary: '由可视化建模输出节点写入标签体系，结果为 0-1 风险分。',
      modelTaskId: 'vm-task-churn-risk',
    },
  }),
]

export const tagRuleVersions: TagRuleVersion[] = tagDefinitions.map((item, index) => ({
  id: `rule-version-${item.id}`,
  tagId: item.id,
  versionNo: index % 2 === 0 ? 2 : 1,
  rule: item.rule,
  isCurrent: true,
  createdBy: item.createdBy,
  createdAt: item.updatedAt,
}))

export const tagRunRecords: TagRunRecord[] = tagDefinitions.flatMap((item, index) => [
  {
    id: `run-${item.id}-latest`,
    tagId: item.id,
    runDate: '2026-05-25',
    partitionDate: '2026-05-25',
    triggerType: item.updateType === 'realtime' ? 'realtime' : 'scheduled',
    status: item.status === 'draft' || item.type === 'manual' ? 'other' : index % 5 === 0 ? 'failed' : 'success',
    startedAt: '2026-05-25T08:00:00+02:00',
    endedAt: '2026-05-25T08:03:02+02:00',
    durationMs: item.latestDurationMs ?? 182000,
    operator: item.updateType === 'manual' ? item.createdBy.name : '系统调度',
    errorMessage: index % 5 === 0 ? '上游行为数据分区等待超时' : undefined,
    logUrl: `/mock/logs/${item.id}`,
  },
  {
    id: `run-${item.id}-prev`,
    tagId: item.id,
    runDate: '2026-05-24',
    partitionDate: '2026-05-24',
    triggerType: 'rerun',
    status: index % 4 === 0 ? 'waiting' : 'success',
    startedAt: '2026-05-24T08:00:00+02:00',
    endedAt: index % 4 === 0 ? undefined : '2026-05-24T08:02:20+02:00',
    durationMs: index % 4 === 0 ? undefined : 140000,
    operator: ownerInsight.name,
    logUrl: `/mock/logs/${item.id}`,
  },
])

export const tagPermissions: TagPermission[] = tagDefinitions.flatMap((item) => [
  {
    id: `perm-${item.id}-team`,
    tagId: item.id,
    principalType: 'group',
    principalId: 'group-user-insight',
    principalName: '用户洞察团队',
    permission: 'manage',
    grantedBy: ownerAdmin.name,
    grantedAt: '2026-05-04T10:00:00+02:00',
  },
  {
    id: `perm-${item.id}-growth`,
    tagId: item.id,
    principalType: 'group',
    principalId: 'group-growth',
    principalName: '增长运营团队',
    permission: item.type === 'sql' ? 'view' : 'edit',
    grantedBy: ownerAdmin.name,
    grantedAt: '2026-05-05T10:00:00+02:00',
  },
])

export const tagTemplates: TagTemplate[] = [
  {
    id: 'tpl-auto-life',
    name: '汽车生命周期阶段',
    description: '广告、留资、到店、试驾、下订、交车六阶段模板。',
    categoryPath: '价值分层 / 生命周期',
    ruleSummary: '过去 180 天对应行为次数大于等于 1。',
    status: 'created',
    tagType: 'lifecycle',
    lifecycleTemplate: true,
  },
  {
    id: 'tpl-auto-series-preference',
    name: '偏好车系 Top3',
    description: '按浏览、试驾、收藏行为计算车系偏好。',
    categoryPath: '行为偏好',
    ruleSummary: '按主体和车系分组，依据行为次数排序取 Top 3。',
    status: 'available',
    tagType: 'preference',
    lifecycleTemplate: false,
  },
  {
    id: 'tpl-auto-intent',
    name: '购车意向等级',
    description: '结合留资、到店、试驾、下订行为划分意向。',
    categoryPath: '行为偏好',
    ruleSummary: '多标签值规则，按优先级输出单值标签。',
    status: 'available',
    tagType: 'rule',
    lifecycleTemplate: false,
  },
]

export const tagLineageNodes: TagLineageNode[] = [
  { id: 'lineage-event', name: '用户行为事件表', assetType: 'data_source', direction: 'upstream', level: 1, status: 'normal' },
  { id: 'lineage-profile', name: '用户属性全量表', assetType: 'data_source', direction: 'upstream', level: 1, status: 'normal' },
  { id: 'lineage-segment', name: '高意向营销分群', assetType: 'segment', direction: 'downstream', level: 1, status: 'normal' },
  { id: 'lineage-api', name: '外部触达 API', assetType: 'api', direction: 'downstream', level: 2, status: 'waiting' },
  { id: 'lineage-analysis', name: '生命周期分析看板', assetType: 'analysis', direction: 'downstream', level: 1, status: 'normal' },
]

export const tagDistributions: Record<string, TagValueDistribution[]> = Object.fromEntries(
  tagDefinitions.map((item) => [
    item.id,
    [
      { value: item.valueType.includes('decimal') ? '0.0-0.3' : '高意向', count: 48200, rate: 18.6, sort: 1 },
      { value: item.valueType.includes('decimal') ? '0.3-0.7' : '中意向', count: 93100, rate: 35.9, sort: 2 },
      { value: item.valueType.includes('decimal') ? '0.7+' : '低意向', count: 117900, rate: 45.5, sort: 3 },
    ],
  ]),
)

export const tagHistories: Record<string, TagHistoryPoint[]> = Object.fromEntries(
  tagDefinitions.map((item) => [
    item.id,
    ['2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25'].map((date, index) => ({
      date,
      total: 220000 + index * 5200,
      values: [
        { value: '高意向', count: 42000 + index * 900 },
        { value: '中意向', count: 82000 + index * 1300 },
        { value: '低意向', count: 96000 + index * 1600 },
      ],
    })),
  ]),
)

export const tagAssessments: Record<string, TagValueAssessment> = Object.fromEntries(
  tagDefinitions.map((item, index) => [
    item.id,
    {
      lastUsedDays: index + 1,
      internalUsageCount: 1280 - index * 37,
      internalReferenceCount: 46 + index,
      internalQueryCount: 560 - index * 9,
      externalCallCount: item.onlineServiceEnabled ? 3200 : 120,
      apiCallCount: item.onlineServiceEnabled ? 2800 : 60,
      p95LatencyMs: item.onlineServiceEnabled ? 38 : 140,
      errorRate: index % 3 === 0 ? 0.7 : 0.2,
    },
  ]),
)

export const tagOperationLogs: TagOperationLog[] = tagDefinitions.flatMap((item) => [
  {
    id: `log-${item.id}-create`,
    tagId: item.id,
    operator: item.createdBy.name,
    actionType: 'create',
    content: '创建标签并保存规则版本。',
    afterJson: item.rule.summary,
    createdAt: item.createdAt,
  },
  {
    id: `log-${item.id}-edit`,
    tagId: item.id,
    operator: ownerInsight.name,
    actionType: 'edit',
    content: '调整标签元信息与展示数量。',
    beforeJson: '展示数量 10',
    afterJson: '展示数量 20',
    createdAt: item.updatedAt,
  },
])

