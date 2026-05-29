import type {
  ProfileAuditLog,
  ProfileBehaviorConfig,
  ProfileBehaviorEvent,
  ProfileBoard,
  ProfileConditionCatalogItem,
  ProfileDetailConfig,
  ProfileFavorite,
  ProfileFeatureFlags,
  ProfileIndividual,
  ProfileListColumn,
  ProfileListConfig,
  ProfilePermissionSet,
  ProfileRelationGraph,
  ProfileSubject,
  ProfileUserColumnConfig,
} from '@/types/profile'
import type { EntityId } from '@/types/common'

const currentUser = {
  id: 'u-xucheng',
  name: '许澄',
  department: '用户洞察团队',
}

const adminOwner = {
  id: 'u-admin',
  name: '陈序',
  department: '平台管理员',
}

const analystOwner = {
  id: 'u-yiran',
  name: '易然',
  department: '数据分析团队',
}

export const profileCurrentUser = currentUser

export const profilePermissionSet: ProfilePermissionSet = {
  viewProfile: true,
  searchProfile: true,
  viewDetail: true,
  tagResource: true,
  behaviorResource: true,
  detailData: true,
  userAttribute: true,
  segmentView: true,
  relationGraph: true,
  multiSubject: true,
  projectConfig: true,
  copySensitiveId: true,
}

export const profileFeatureFlags: ProfileFeatureFlags = {
  profileConfigured: true,
  multiSubjectEnabled: true,
  behaviorFlowConfigured: true,
  metadataDisplayNameEnabled: true,
  propertyDictionaryEnabled: true,
}

export const profileSubjects: ProfileSubject[] = [
  {
    type: 'user',
    name: '用户',
    description: '统一用户主体，支持手机号、会员 ID、设备 ID、OpenID 与 UnionID 精准检索。',
    primaryIdType: 'base_id',
    allowMultiSubjectSearch: true,
    idTypes: [
      { id: 'base_id', label: '基准 ID', sensitive: false, masked: false, copyable: true, format: 'plain' },
      { id: 'user_id', label: '用户 ID', sensitive: false, masked: false, copyable: true, format: 'plain' },
      { id: 'member_id', label: '会员 ID', sensitive: false, masked: false, copyable: true, format: 'plain' },
      { id: 'mobile', label: '手机号', sensitive: true, masked: true, copyable: true, format: 'mobile' },
      { id: 'device_id', label: '设备 ID', sensitive: true, masked: true, copyable: true, format: 'device' },
      { id: 'openid', label: 'OpenID', sensitive: true, masked: true, copyable: false, format: 'openid' },
      { id: 'unionid', label: 'UnionID', sensitive: true, masked: true, copyable: false, format: 'openid' },
    ],
  },
  {
    type: 'store',
    name: '门店',
    description: '线下门店主体，支持门店 ID、商圈 ID 与经营区域分析。',
    primaryIdType: 'store_id',
    allowMultiSubjectSearch: false,
    idTypes: [
      { id: 'store_id', label: '门店 ID', sensitive: false, masked: false, copyable: true, format: 'plain' },
      { id: 'area_id', label: '商圈 ID', sensitive: false, masked: false, copyable: true, format: 'plain' },
    ],
  },
  {
    type: 'vehicle',
    name: '车辆',
    description: '车辆主体，支持车辆 ID 与 VIN 检索，用于人车关系回溯。',
    primaryIdType: 'vehicle_id',
    allowMultiSubjectSearch: false,
    idTypes: [
      { id: 'vehicle_id', label: '车辆 ID', sensitive: false, masked: false, copyable: true, format: 'plain' },
      { id: 'vin', label: 'VIN', sensitive: true, masked: true, copyable: true, format: 'vin' },
    ],
  },
  {
    type: 'product',
    name: '商品',
    description: '商品主体，支持 SKU、SPU 与类目关系分析。',
    primaryIdType: 'sku_id',
    allowMultiSubjectSearch: false,
    idTypes: [
      { id: 'sku_id', label: 'SKU ID', sensitive: false, masked: false, copyable: true, format: 'plain' },
      { id: 'spu_id', label: 'SPU ID', sensitive: false, masked: false, copyable: true, format: 'plain' },
    ],
  },
]

export const profileBoards: ProfileBoard[] = [
  {
    id: 'board-user-growth',
    projectId: 'project-demo',
    subjectType: 'user',
    name: '用户增长画像',
    description: '面向增长运营和门店导购，展示身份、标签、行为路径和跨主体关系。',
    isDefault: true,
    status: 'enabled',
    createdBy: adminOwner,
    createdAt: '2026-04-18T09:00:00+02:00',
    updatedAt: '2026-05-26T16:30:00+02:00',
  },
  {
    id: 'board-user-service',
    projectId: 'project-demo',
    subjectType: 'user',
    name: '会员服务画像',
    description: '面向客服和会员运营，突出会员权益、售后风险和近期行为。',
    isDefault: false,
    status: 'enabled',
    createdBy: analystOwner,
    createdAt: '2026-05-02T10:00:00+02:00',
    updatedAt: '2026-05-25T18:20:00+02:00',
  },
  {
    id: 'board-store-default',
    projectId: 'project-demo',
    subjectType: 'store',
    name: '门店经营画像',
    description: '围绕门店客流、关系用户和关键商品表现查看门店画像。',
    isDefault: true,
    status: 'enabled',
    createdBy: adminOwner,
    createdAt: '2026-05-01T09:30:00+02:00',
    updatedAt: '2026-05-20T11:12:00+02:00',
  },
  {
    id: 'board-vehicle-default',
    projectId: 'project-demo',
    subjectType: 'vehicle',
    name: '车辆关系画像',
    description: '展示车辆身份、关联车主、维保行为与销售线索。',
    isDefault: true,
    status: 'enabled',
    createdBy: adminOwner,
    createdAt: '2026-05-04T15:30:00+02:00',
    updatedAt: '2026-05-24T10:15:00+02:00',
  },
  {
    id: 'board-product-default',
    projectId: 'project-demo',
    subjectType: 'product',
    name: '商品意向画像',
    description: '展示商品身份、意向用户、关联门店和销售转化关系。',
    isDefault: true,
    status: 'enabled',
    createdBy: adminOwner,
    createdAt: '2026-05-06T11:20:00+02:00',
    updatedAt: '2026-05-24T16:45:00+02:00',
  },
]

export const profileColumns: ProfileListColumn[] = [
  { key: 'baseId', title: '基准 ID', type: 'id', field: 'baseId', width: 170, permission: 'viewDetail', realtimeSupported: true, required: true, defaultVisible: true },
  { key: 'displayName', title: '昵称/名称', type: 'profile', field: 'displayName', width: 150, permission: 'detailData', realtimeSupported: true, defaultVisible: true },
  { key: 'mobile', title: '手机号', type: 'identity', field: 'mobile', width: 150, permission: 'userAttribute', realtimeSupported: true, defaultVisible: true },
  { key: 'memberLevel', title: '会员等级', type: 'attribute', field: 'memberLevel', width: 120, permission: 'userAttribute', realtimeSupported: true, defaultVisible: true },
  { key: 'city', title: '城市', type: 'attribute', field: 'city', width: 110, permission: 'userAttribute', realtimeSupported: true, defaultVisible: true },
  { key: 'activeScore', title: '活跃评分', type: 'tag', field: 'activeScore', width: 120, permission: 'tagResource', realtimeSupported: false, defaultVisible: true },
  { key: 'valueLevel', title: '价值等级', type: 'tag', field: 'valueLevel', width: 120, permission: 'tagResource', realtimeSupported: false, defaultVisible: true },
  { key: 'lastBehavior', title: '最近行为', type: 'behavior', field: 'lastBehavior', width: 190, permission: 'behaviorResource', realtimeSupported: true, defaultVisible: true },
  { key: 'segmentNames', title: '所在分群', type: 'segment', field: 'segmentNames', width: 240, permission: 'segmentView', realtimeSupported: false, defaultVisible: false },
  { key: 'deviceId', title: '设备 ID', type: 'identity', field: 'deviceId', width: 180, permission: 'userAttribute', realtimeSupported: true, defaultVisible: false },
  { key: 'lastOrderAmount', title: '近 30 天消费', type: 'detail', field: 'lastOrderAmount', width: 140, permission: 'detailData', realtimeSupported: false, defaultVisible: false },
]

export const profileListConfigs: ProfileListConfig[] = [
  {
    id: 'list-config-growth',
    boardId: 'board-user-growth',
    defaultColumns: ['baseId', 'displayName', 'mobile', 'memberLevel', 'city', 'activeScore', 'valueLevel', 'lastBehavior'],
    searchableIdTypes: ['base_id', 'user_id', 'member_id', 'mobile', 'device_id', 'openid', 'unionid'],
    allowLatestId: true,
    availableColumns: profileColumns,
    createdAt: '2026-04-18T09:05:00+02:00',
    updatedAt: '2026-05-26T16:30:00+02:00',
  },
  {
    id: 'list-config-service',
    boardId: 'board-user-service',
    defaultColumns: ['baseId', 'displayName', 'mobile', 'memberLevel', 'segmentNames', 'lastBehavior'],
    searchableIdTypes: ['base_id', 'member_id', 'mobile'],
    allowLatestId: true,
    availableColumns: profileColumns,
    createdAt: '2026-05-02T10:05:00+02:00',
    updatedAt: '2026-05-25T18:20:00+02:00',
  },
  {
    id: 'list-config-store',
    boardId: 'board-store-default',
    defaultColumns: ['baseId', 'displayName', 'city', 'valueLevel', 'lastBehavior'],
    searchableIdTypes: ['store_id', 'area_id'],
    allowLatestId: false,
    availableColumns: profileColumns,
    createdAt: '2026-05-01T09:35:00+02:00',
    updatedAt: '2026-05-20T11:12:00+02:00',
  },
  {
    id: 'list-config-vehicle',
    boardId: 'board-vehicle-default',
    defaultColumns: ['baseId', 'displayName', 'lastBehavior'],
    searchableIdTypes: ['vehicle_id', 'vin'],
    allowLatestId: false,
    availableColumns: profileColumns,
    createdAt: '2026-05-04T15:35:00+02:00',
    updatedAt: '2026-05-24T10:15:00+02:00',
  },
  {
    id: 'list-config-product',
    boardId: 'board-product-default',
    defaultColumns: ['baseId', 'displayName', 'valueLevel', 'lastBehavior'],
    searchableIdTypes: ['sku_id', 'spu_id'],
    allowLatestId: false,
    availableColumns: profileColumns.filter((column) => !['mobile', 'memberLevel', 'deviceId', 'lastOrderAmount'].includes(column.key)),
    createdAt: '2026-05-06T11:25:00+02:00',
    updatedAt: '2026-05-24T16:45:00+02:00',
  },
]

export const profileDetailConfigs: ProfileDetailConfig[] = [
  {
    id: 'detail-config-growth',
    boardId: 'board-user-growth',
    archiveFields: ['avatar', 'name', 'gender', 'age', 'occupation', 'mobile', 'memberLevel', 'city', 'primaryIds', 'basicTags'],
    overviewComponents: ['spend', 'activity', 'leadIntent', 'serviceRisk', 'coupon', 'storeVisit'],
    journeyConfig: { enabled: true, maxNodes: 14 },
    tagGroups: ['growth', 'value', 'preference'],
    segmentGroups: ['growth', 'risk'],
    identityConfig: { highlightTypes: ['member_id', 'mobile', 'device_id', 'openid'], archiveLimit: 30 },
    enabledTabs: ['overview', 'behavior', 'tags', 'relation'],
    globalDescription: '该看板聚焦用户增长转化，优先展示近期活跃、价值、门店到访和多主体身份关系。',
  },
  {
    id: 'detail-config-service',
    boardId: 'board-user-service',
    archiveFields: ['avatar', 'name', 'mobile', 'memberLevel', 'city', 'primaryIds'],
    overviewComponents: ['serviceRisk', 'spend', 'coupon', 'activity'],
    journeyConfig: { enabled: true, maxNodes: 10 },
    tagGroups: ['value', 'risk', 'service'],
    segmentGroups: ['service', 'risk'],
    identityConfig: { highlightTypes: ['member_id', 'mobile'], archiveLimit: 30 },
    enabledTabs: ['overview', 'behavior', 'tags', 'relation'],
    globalDescription: '该看板面向会员服务场景，突出权益、售后风险和近期关键行为。',
  },
  {
    id: 'detail-config-store',
    boardId: 'board-store-default',
    archiveFields: ['name', 'city', 'primaryIds', 'basicTags'],
    overviewComponents: ['activity', 'storeVisit', 'spend'],
    journeyConfig: { enabled: false, maxNodes: 0 },
    tagGroups: ['store', 'value'],
    segmentGroups: ['store'],
    identityConfig: { highlightTypes: ['store_id', 'area_id'], archiveLimit: 30 },
    enabledTabs: ['overview', 'relation'],
    globalDescription: '该看板展示门店与用户、商品之间的经营关系。',
  },
  {
    id: 'detail-config-vehicle',
    boardId: 'board-vehicle-default',
    archiveFields: ['name', 'primaryIds', 'basicTags'],
    overviewComponents: ['serviceRisk', 'leadIntent'],
    journeyConfig: { enabled: true, maxNodes: 6 },
    tagGroups: ['vehicle'],
    segmentGroups: ['risk'],
    identityConfig: { highlightTypes: ['vehicle_id', 'vin'], archiveLimit: 30 },
    enabledTabs: ['overview', 'behavior', 'relation'],
    globalDescription: '该看板用于追踪车辆关联用户、维保行为和线索转化。',
  },
  {
    id: 'detail-config-product',
    boardId: 'board-product-default',
    archiveFields: ['name', 'primaryIds', 'basicTags'],
    overviewComponents: ['leadIntent', 'storeVisit', 'activity'],
    journeyConfig: { enabled: false, maxNodes: 0 },
    tagGroups: ['product', 'value', 'store'],
    segmentGroups: ['product', 'store'],
    identityConfig: { highlightTypes: ['sku_id', 'spu_id'], archiveLimit: 30 },
    enabledTabs: ['overview', 'tags', 'relation'],
    globalDescription: '该看板用于查看商品意向、关联门店、关联用户与商品主数据。',
  },
]

export const profileBehaviorConfigs: ProfileBehaviorConfig[] = [
  {
    id: 'behavior-config-growth',
    boardId: 'board-user-growth',
    categories: [
      { id: 'cat-awareness', name: '认知触达', tableName: 'dwd_user_event_log', events: ['ad_click', 'wechat_article_read', 'gmp_sdk_logs'], description: '广告、微信文章与 GMP 触达事件。' },
      { id: 'cat-interest', name: '兴趣互动', tableName: 'dwd_user_event_log', events: ['miniapp_browse', 'vehicle_config_view', 'store_detail_view'], description: '小程序浏览、车型配置和门店详情行为。' },
      { id: 'cat-conversion', name: '转化交易', tableName: 'dwd_order_detail', events: ['coupon_receive', 'test_drive_book', 'order_submit'], description: '领券、试驾预约和订单提交行为。' },
    ],
    hiddenEvents: ['debug_ping'],
    hiddenProperties: ['ip', 'user_agent', 'current_id', 'schedule_id', 'event_time'],
    platforms: ['小程序', '微信', 'Finder', 'GMP', 'App', 'Web'],
    processes: ['全部流程', '认知', '兴趣', '转化', '复购'],
    defaultTimeRange: '30d',
    maxRangeDays: 180,
    createdAt: '2026-04-18T09:10:00+02:00',
    updatedAt: '2026-05-26T16:30:00+02:00',
  },
  {
    id: 'behavior-config-service',
    boardId: 'board-user-service',
    categories: [
      { id: 'cat-service', name: '服务咨询', tableName: 'dwd_service_event_log', events: ['service_ticket_create', 'app_feedback', 'coupon_receive'], description: '客服工单、反馈与权益领取。' },
      { id: 'cat-conversion', name: '交易履约', tableName: 'dwd_order_detail', events: ['order_submit', 'refund_apply'], description: '订单、退款和履约事件。' },
    ],
    hiddenEvents: ['debug_ping'],
    hiddenProperties: ['ip', 'user_agent', 'schedule_id'],
    platforms: ['App', 'Web', '小程序'],
    processes: ['全部流程', '咨询', '履约', '复购'],
    defaultTimeRange: '30d',
    maxRangeDays: 180,
    createdAt: '2026-05-02T10:08:00+02:00',
    updatedAt: '2026-05-25T18:20:00+02:00',
  },
  {
    id: 'behavior-config-vehicle',
    boardId: 'board-vehicle-default',
    categories: [
      { id: 'cat-vehicle-usage', name: '试驾使用', tableName: 'dwd_vehicle_event_log', events: ['test_drive_book', 'vehicle_config_view'], description: '车辆预约、到店和试驾使用行为。' },
      { id: 'cat-vehicle-service', name: '车辆维保', tableName: 'dwd_vehicle_service_log', events: ['vehicle_check', 'service_ticket_create'], description: '车辆检查、维保和工单行为。' },
    ],
    hiddenEvents: ['debug_ping'],
    hiddenProperties: ['ip', 'user_agent'],
    platforms: ['门店系统', '小程序', 'App'],
    processes: ['全部流程', '预约', '试驾', '维保'],
    defaultTimeRange: '30d',
    maxRangeDays: 180,
    createdAt: '2026-05-04T15:40:00+02:00',
    updatedAt: '2026-05-24T10:15:00+02:00',
  },
]

export const profileUserColumnConfigs: ProfileUserColumnConfig[] = [
  {
    id: 'column-current-growth',
    userId: currentUser.id,
    boardId: 'board-user-growth',
    columns: ['baseId', 'displayName', 'mobile', 'memberLevel', 'city', 'activeScore', 'valueLevel', 'lastBehavior', 'segmentNames'],
    updatedAt: '2026-05-26T18:08:00+02:00',
  },
]

export const profileFavorites: ProfileFavorite[] = [
  {
    id: 'favorite-1',
    userId: currentUser.id,
    boardId: 'board-user-growth',
    subjectType: 'user',
    baseId: 'U100001',
    createdAt: '2026-05-26T09:20:00+02:00',
  },
]

const commonTags = {
  growthActive: {
    id: 'tag-active-7d',
    name: '近 7 日活跃',
    value: '高活跃',
    type: '规则标签',
    categoryId: 'cat-growth',
    categoryName: '增长标签',
    groupId: 'growth',
    groupName: '增长',
    source: '标签体系',
    description: '基于最近 7 天登录、浏览、互动综合计算。',
    updatedAt: '2026-05-26T02:10:00+02:00',
    permission: true,
  },
  highValue: {
    id: 'tag-value-level',
    name: '价值等级',
    value: 'A',
    type: '统计标签',
    categoryId: 'cat-value',
    categoryName: '价值标签',
    groupId: 'value',
    groupName: '价值',
    source: '订单明细',
    description: '近 180 天消费与互动综合价值分层。',
    updatedAt: '2026-05-26T02:30:00+02:00',
    permission: true,
  },
}

const extraTagNames = [
  ['tag-channel-sms', '短信偏好', '高', '增长', '增长标签'],
  ['tag-channel-push', 'Push 偏好', '中', '增长', '增长标签'],
  ['tag-channel-wechat', '微信触达偏好', '高', '增长', '增长标签'],
  ['tag-price-sensitive', '价格敏感度', '中', '价值', '价值标签'],
  ['tag-maintenance-cycle', '保养周期', '30 天内', '服务', '服务标签'],
  ['tag-after-sales', '售后活跃度', '高', '服务', '服务标签'],
  ['tag-family-car', '家庭用车倾向', '强', '偏好', '偏好标签'],
  ['tag-energy-type', '能源偏好', '混动', '偏好', '偏好标签'],
  ['tag-content-video', '内容偏好', '试驾视频', '偏好', '偏好标签'],
  ['tag-risk-churn', '流失风险', '低', '风险', '风险标签'],
  ['tag-risk-complaint', '投诉风险', '低', '风险', '风险标签'],
  ['tag-store-distance', '门店距离', '5km 内', '门店', '门店标签'],
] as const

const extraSegments = [
  ['segment-high-value-suv', '高价值 SUV 意向'],
  ['segment-maintenance-soon', '30 天内保养提醒'],
  ['segment-wechat-active', '微信内容高互动'],
  ['segment-push-sensitive', 'Push 高响应用户'],
  ['segment-test-drive-pending', '已预约待试驾'],
  ['segment-store-ja', '上海静安店重点跟进'],
  ['segment-cross-sell', '精品配件交叉销售'],
  ['segment-renewal-potential', '换购潜力用户'],
  ['segment-family-car', '家庭用车关注人群'],
  ['segment-service-low-risk', '低服务风险会员'],
  ['segment-video-content', '视频内容偏好人群'],
  ['segment-coupon-active', '优惠券活跃用户'],
] as const

const overflowGrowthTags = [
  ['tag-growth-window-1', '触达窗口', '晚间'],
  ['tag-growth-window-2', '高频渠道', '小程序'],
  ['tag-growth-window-3', '转化阶段', '比较期'],
  ['tag-growth-window-4', '跟进优先级', 'P1'],
  ['tag-growth-window-5', '最近互动强度', '强'],
  ['tag-growth-window-6', '运营动作建议', '顾问回访'],
] as const

function maskMobile(value: string): string {
  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

function buildGeneratedUser(index: number): ProfileIndividual {
  const idNumber = 100100 + index
  const baseId = `U${idNumber}`
  const mobile = `139${String(62000000 + index * 137).slice(0, 8)}`
  const cityList = ['上海', '杭州', '苏州', '南京', '成都', '深圳']
  const levelList = ['黑金会员', '金卡会员', '银卡会员', '普通会员']
  const valueList = ['A', 'B', 'C']
  const city = cityList[index % cityList.length] ?? '上海'
  const memberLevel = levelList[index % levelList.length] ?? '金卡会员'
  const activeScore = 48 + (index % 45)
  const valueLevel = valueList[index % valueList.length] ?? 'B'
  const orderAmount = 480 + index * 260
  const hasIntent = index % 2 === 0
  const belongsCoreSegment = index % 3 !== 0
  return {
    baseId,
    subjectType: 'user',
    displayName: `演示用户${String(index).padStart(2, '0')}`,
    avatarText: '演',
    globalDescription: `${city}${memberLevel}，用于演示列表分页、自定义筛选、标签联动和分群联动。`,
    archive: [
      { key: 'name', label: '姓名', value: `演示用户${String(index).padStart(2, '0')}`, permission: 'detailData' },
      { key: 'gender', label: '性别', value: index % 2 ? '男' : '女', permission: 'userAttribute' },
      { key: 'age', label: '年龄', value: String(24 + (index % 22)), permission: 'userAttribute' },
      { key: 'occupation', label: '职业', value: index % 2 ? '产品经理' : '运营经理', permission: 'userAttribute' },
      { key: 'mobile', label: '手机号', value: maskMobile(mobile), permission: 'userAttribute', sensitive: true },
      { key: 'memberLevel', label: '会员等级', value: memberLevel, permission: 'userAttribute' },
      { key: 'city', label: '城市', value: city, permission: 'userAttribute' },
      { key: 'basicTags', label: '基础标签', value: `${activeScore >= 60 ? '活跃' : '沉默'} / ${valueLevel} / ${hasIntent ? '高意向' : '培育中'}`, permission: 'tagResource' },
    ],
    identities: [
      { idType: 'base_id', idTypeLabel: '基准 ID', value: baseId, maskedValue: baseId, isPrimary: true, masked: false, sensitive: false, copyable: true, source: 'ID Mapping', updatedAt: '2026-05-26T08:00:00+02:00' },
      { idType: 'user_id', idTypeLabel: '用户 ID', value: `user_demo_${idNumber}`, maskedValue: `user_demo_${idNumber}`, isPrimary: false, masked: false, sensitive: false, copyable: true, source: 'App 登录', updatedAt: '2026-05-26T08:05:00+02:00' },
      { idType: 'member_id', idTypeLabel: '会员 ID', value: `M${880000 + index}`, maskedValue: `M${880000 + index}`, isPrimary: false, masked: false, sensitive: false, copyable: true, source: 'CRM', updatedAt: '2026-05-26T08:10:00+02:00' },
      { idType: 'mobile', idTypeLabel: '手机号', value: mobile, maskedValue: maskMobile(mobile), isPrimary: false, masked: true, sensitive: true, copyable: true, source: 'CRM', updatedAt: '2026-05-26T08:10:00+02:00' },
      { idType: 'device_id', idTypeLabel: '设备 ID', value: `AID-DEMO-${idNumber}-A`, maskedValue: `AID-DE****${String(idNumber).slice(-4)}`, isPrimary: false, masked: true, sensitive: true, copyable: true, source: 'App SDK', updatedAt: '2026-05-26T08:20:00+02:00' },
    ],
    tags: [
      { ...commonTags.growthActive, value: activeScore >= 75 ? '高活跃' : activeScore >= 60 ? '中活跃' : '低活跃' },
      { ...commonTags.highValue, value: valueLevel },
      ...(hasIntent
        ? [{ id: 'tag-rule-intent', name: '购车高意向人群', value: '高意向', type: '规则标签', categoryId: 'cat-behavior', categoryName: '行为偏好', groupId: 'growth', groupName: '增长', source: '标签体系', description: '基于浏览车型、留资、到店行为配置高/中意向标签值。', updatedAt: '2026-05-26T06:40:00+02:00', permission: true }]
        : []),
      { id: `tag-demo-city-${index}`, name: '常驻城市', value: city, type: '属性标签', categoryId: 'cat-profile', categoryName: '基础画像', groupId: 'profile', groupName: '画像', source: '用户属性', description: '用于演示标签目录和平铺排序。', updatedAt: '2026-05-25T06:40:00+02:00', permission: true },
    ],
    segments: [
      ...(belongsCoreSegment ? [{ id: 'segment-low-coin-high-active', name: '低金币高活跃用户', groupName: '增长运营', count: 328901, updatedAt: '2026-05-26T02:00:00+02:00', permission: true }] : []),
      ...(hasIntent ? [{ id: 'segment-suv-intent', name: 'SUV 高意向人群', groupName: '门店联动', count: 58210, updatedAt: '2026-05-26T03:30:00+02:00', permission: true }] : []),
      { id: `segment-demo-city-${index % 6}`, name: `${city}城市运营池`, groupName: '区域运营', count: 12000 + index * 130, updatedAt: '2026-05-25T03:30:00+02:00', permission: true },
    ],
    overviewCards: [
      { id: 'activity', title: '活跃评分', value: String(activeScore), description: '用于演示客户重点信息卡片。', updatedAt: '2026-05-26T08:40:00+02:00', permission: 'tagResource' },
      { id: 'spend', title: '近 30 天消费', value: `¥${orderAmount.toLocaleString()}`, description: '用于演示明细数据列和自定义筛选。', updatedAt: '2026-05-26T09:00:00+02:00', permission: 'detailData' },
      { id: 'leadIntent', title: '购车意向', value: hasIntent ? '高' : '中', description: '用于演示标签联动。', updatedAt: '2026-05-25T20:10:00+02:00', permission: 'behaviorResource' },
    ],
    journey: [
      { id: `j-${index}-1`, name: '认知', status: 'done', time: '2026-05-18', description: '触达活动进入。', details: [{ label: '行为', value: '广告点击' }] },
      { id: `j-${index}-2`, name: '兴趣', status: hasIntent ? 'done' : 'current', time: '2026-05-23', description: '浏览车型或权益。', details: [{ label: '标签', value: hasIntent ? '高意向' : '培育中' }] },
      { id: `j-${index}-3`, name: '转化', status: hasIntent ? 'current' : 'pending', description: hasIntent ? '等待门店跟进。' : '尚未留资。', details: [] },
    ],
    customValues: {
      mobile: maskMobile(mobile),
      memberLevel,
      city,
      activeScore,
      valueLevel,
      lastBehavior: `${hasIntent ? '车型配置查看' : '权益页浏览'} / ${index % 2 ? 'Web' : '小程序'} / 2026-05-${String(10 + (index % 16)).padStart(2, '0')} 18:20`,
      segmentNames: belongsCoreSegment ? '低金币高活跃用户、区域运营池' : '区域运营池',
      deviceId: `AID-DE****${String(idNumber).slice(-4)}`,
      lastOrderAmount: orderAmount,
    },
    relationSummary: hasIntent ? '关联门店、车辆和商品偏好。' : '关联设备和内容偏好。',
    createdAt: '2026-05-01T09:00:00+02:00',
    updatedAt: '2026-05-26T09:10:00+02:00',
  }
}

const generatedUsers = Array.from({ length: 36 }, (_, index) => buildGeneratedUser(index + 1))

const manyIdentities = Array.from({ length: 34 }, (_, index) => ({
  idType: index % 2 === 0 ? 'device_id' : 'openid',
  idTypeLabel: index % 2 === 0 ? '设备 ID' : 'OpenID',
  value: index % 2 === 0 ? `AID-HISTORY-${String(index + 1).padStart(2, '0')}-U100001` : `openid_history_${String(index + 1).padStart(2, '0')}_U100001`,
  maskedValue: index % 2 === 0 ? `AID-HI****${String(index + 1).padStart(2, '0')}` : `openid****${String(index + 1).padStart(2, '0')}`,
  isPrimary: false,
  masked: true,
  sensitive: true,
  copyable: index % 3 !== 0,
  source: index % 2 === 0 ? 'App SDK 历史设备' : '微信历史授权',
  updatedAt: `2026-05-${String(1 + (index % 26)).padStart(2, '0')}T08:00:00+02:00`,
}))

export const profileIndividuals: ProfileIndividual[] = [
  {
    baseId: 'U100001',
    subjectType: 'user',
    displayName: '林小满',
    avatarText: '林',
    globalDescription: '高活跃高价值会员，最近 14 天多次浏览 SUV 车型，并在门店留资。',
    archive: [
      { key: 'name', label: '姓名', value: '林小满', permission: 'detailData' },
      { key: 'gender', label: '性别', value: '女', permission: 'userAttribute' },
      { key: 'age', label: '年龄', value: '31', permission: 'userAttribute' },
      { key: 'occupation', label: '职业', value: '品牌运营经理', permission: 'userAttribute' },
      { key: 'mobile', label: '手机号', value: '138****2678', permission: 'userAttribute', sensitive: true },
      { key: 'memberLevel', label: '会员等级', value: '黑金会员', permission: 'userAttribute' },
      { key: 'city', label: '城市', value: '上海', permission: 'userAttribute' },
      { key: 'basicTags', label: '基础标签', value: '高活跃 / 高价值 / SUV 意向', permission: 'tagResource' },
    ],
    identities: [
      { idType: 'base_id', idTypeLabel: '基准 ID', value: 'U100001', maskedValue: 'U100001', isPrimary: true, masked: false, sensitive: false, copyable: true, source: 'ID Mapping', updatedAt: '2026-05-26T08:30:00+02:00' },
      { idType: 'user_id', idTypeLabel: '用户 ID', value: 'user_891027', maskedValue: 'user_891027', isPrimary: false, masked: false, sensitive: false, copyable: true, source: 'App 登录', updatedAt: '2026-05-25T22:10:00+02:00' },
      { idType: 'member_id', idTypeLabel: '会员 ID', value: 'M983214', maskedValue: 'M983214', isPrimary: false, masked: false, sensitive: false, copyable: true, source: 'CRM', updatedAt: '2026-05-25T18:18:00+02:00' },
      { idType: 'mobile', idTypeLabel: '手机号', value: '13876282678', maskedValue: '138****2678', isPrimary: false, masked: true, sensitive: true, copyable: true, source: 'CRM', updatedAt: '2026-05-25T18:18:00+02:00' },
      { idType: 'device_id', idTypeLabel: '设备 ID', value: 'AID-6F92-8C11-9B0A', maskedValue: 'AID-6F****9B0A', isPrimary: false, masked: true, sensitive: true, copyable: true, source: 'App SDK', updatedAt: '2026-05-26T07:40:00+02:00' },
      { idType: 'openid', idTypeLabel: 'OpenID', value: 'ox9pL1W8u2x9pC7a9326', maskedValue: 'ox9p****9326', isPrimary: false, masked: true, sensitive: true, copyable: false, source: '微信小程序', updatedAt: '2026-05-22T09:25:00+02:00' },
      ...manyIdentities,
    ],
    tags: [
      commonTags.growthActive,
      commonTags.highValue,
      { id: 'tag-rule-intent', name: '购车高意向人群', value: '高意向', type: '规则标签', categoryId: 'cat-behavior', categoryName: '行为偏好', groupId: 'growth', groupName: '增长', source: '标签体系', description: '基于浏览车型、留资、到店行为配置高/中意向标签值。', updatedAt: '2026-05-26T06:40:00+02:00', permission: true },
      { id: 'tag-suv-intent', name: 'SUV 车型意向', value: '中大型 SUV', type: '偏好标签', categoryId: 'cat-preference', categoryName: '偏好标签', groupId: 'preference', groupName: '偏好', source: '浏览行为', description: '根据车型浏览、配置器停留和收藏计算。', updatedAt: '2026-05-26T06:20:00+02:00', permission: true },
      { id: 'tag-service-risk', name: '服务风险', value: '低', type: '模型标签', categoryId: 'cat-service', categoryName: '服务标签', groupId: 'service', groupName: '服务', source: '模型评分', description: '结合客服咨询、退款和投诉行为计算。', updatedAt: '2026-05-26T01:40:00+02:00', permission: true },
      { id: 'tag-coupon-sensitive', name: '优惠敏感度', value: '中高', type: '统计标签', categoryId: 'cat-growth', categoryName: '增长标签', groupId: 'growth', groupName: '增长', source: '营销事件', description: '根据领券、用券与转化行为计算。', updatedAt: '2026-05-26T02:05:00+02:00', permission: true },
      ...extraTagNames.map(([id, name, value, groupName, categoryName], index) => ({
        id,
        name,
        value,
        type: index % 2 ? '统计标签' : '规则标签',
        categoryId: `cat-extra-${index}`,
        categoryName,
        groupId: groupName === '增长' ? 'growth' : groupName === '价值' ? 'value' : groupName === '服务' ? 'service' : groupName === '风险' ? 'risk' : groupName === '门店' ? 'store' : 'preference',
        groupName,
        source: index % 2 ? '模型计算' : '标签体系',
        description: `${name}用于演示每组超过 10 条标签后的更多抽屉、目录和平铺排序。`,
        updatedAt: `2026-05-${String(12 + index).padStart(2, '0')}T02:05:00+02:00`,
        permission: true,
      })),
      ...overflowGrowthTags.map(([id, name, value], index) => ({
        id,
        name,
        value,
        type: '规则标签',
        categoryId: `cat-growth-overflow-${index}`,
        categoryName: '增长标签',
        groupId: 'growth',
        groupName: '增长',
        source: '标签体系',
        description: `${name}用于演示同一标签组超过 10 条后的更多抽屉。`,
        updatedAt: `2026-05-${String(20 + index).padStart(2, '0')}T02:35:00+02:00`,
        permission: true,
      })),
    ],
    segments: [
      { id: 'segment-low-coin-high-active', name: '低金币高活跃用户', groupName: '增长运营', count: 328901, updatedAt: '2026-05-26T02:00:00+02:00', permission: true },
      { id: 'segment-suv-intent', name: 'SUV 高意向人群', groupName: '门店联动', count: 58210, updatedAt: '2026-05-26T03:30:00+02:00', permission: true },
      { id: 'segment-vip-service', name: '黑金会员服务保障', groupName: '会员服务', count: 12340, updatedAt: '2026-05-25T22:00:00+02:00', permission: true },
      ...extraSegments.map(([id, name], index) => ({
        id,
        name,
        groupName: index % 2 ? '精细化运营' : '增长运营',
        count: 8000 + index * 2137,
        updatedAt: `2026-05-${String(14 + index).padStart(2, '0')}T03:00:00+02:00`,
        permission: true,
      })),
    ],
    overviewCards: [
      { id: 'spend', title: '近 30 天消费', value: '¥12,680', description: '较上月提升 18%，主要来自精品配件和试驾权益。', updatedAt: '2026-05-26T09:00:00+02:00', permission: 'detailData' },
      { id: 'activity', title: '活跃评分', value: '92', description: 'App、小程序和微信文章均有近期互动。', updatedAt: '2026-05-26T08:40:00+02:00', permission: 'tagResource' },
      { id: 'leadIntent', title: '购车意向', value: '高', description: '浏览车型配置 6 次，并预约门店顾问。', updatedAt: '2026-05-25T20:10:00+02:00', permission: 'behaviorResource' },
      { id: 'serviceRisk', title: '服务风险', value: '低', description: '近 90 天无投诉，最近一次咨询已闭环。', updatedAt: '2026-05-26T01:40:00+02:00', permission: 'tagResource' },
      { id: 'coupon', title: '权益偏好', value: '保养券', description: '领券后 3 天内转化概率较高。', updatedAt: '2026-05-25T18:45:00+02:00', permission: 'behaviorResource' },
      { id: 'storeVisit', title: '到店倾向', value: '上海静安店', description: '近 14 天查看该门店详情 3 次。', updatedAt: '2026-05-25T21:15:00+02:00', permission: 'behaviorResource' },
    ],
    journey: [
      { id: 'j1', name: '认知', status: 'done', time: '2026-05-12', description: '广告点击后进入品牌内容页。', details: [{ label: '行为', value: '广告点击、微信文章阅读' }] },
      { id: 'j2', name: '兴趣', status: 'done', time: '2026-05-18', description: '持续浏览 SUV 车型。', details: [{ label: '标签', value: 'SUV 车型意向：中大型 SUV' }] },
      { id: 'j3', name: '比较', status: 'current', time: '2026-05-25', description: '查看门店与试驾预约入口。', details: [{ label: '行为', value: '门店详情查看、试驾预约' }, { label: '分群', value: 'SUV 高意向人群' }] },
      { id: 'j4', name: '转化', status: 'pending', description: '尚未提交订单。', details: [] },
      { id: 'j5', name: '复购', status: 'empty', description: '暂无复购行为。', details: [] },
      { id: 'j6', name: '权益', status: 'done', time: '2026-05-21', description: '领取保养券。', details: [{ label: '行为', value: '领券' }] },
      { id: 'j7', name: '内容', status: 'done', time: '2026-05-22', description: '观看试驾视频。', details: [{ label: '内容', value: '试驾视频' }] },
      { id: 'j8', name: '顾问', status: 'current', time: '2026-05-25', description: '等待顾问跟进。', details: [{ label: '门店', value: '上海静安体验店' }] },
      { id: 'j9', name: '报价', status: 'pending', description: '尚未生成报价。', details: [] },
      { id: 'j10', name: '试驾', status: 'pending', description: '预约待到店。', details: [] },
      { id: 'j11', name: '订单', status: 'pending', description: '尚未提交订单。', details: [] },
      { id: 'j12', name: '交付', status: 'empty', description: '暂无交付信息。', details: [] },
      { id: 'j13', name: '保养', status: 'empty', description: '暂无保养记录。', details: [] },
      { id: 'j14', name: '换购', status: 'empty', description: '暂无换购线索。', details: [] },
    ],
    customValues: {
      mobile: '138****2678',
      memberLevel: '黑金会员',
      city: '上海',
      activeScore: 92,
      valueLevel: 'A',
      lastBehavior: '试驾预约 / 小程序 / 2026-05-25 20:10',
      segmentNames: '低金币高活跃用户、SUV 高意向人群',
      deviceId: 'AID-6F****9B0A',
      lastOrderAmount: '¥12,680',
    },
    relationSummary: '关联 1 辆车、2 个设备、1 个高意向门店和 3 个商品偏好。',
    createdAt: '2025-10-12T08:00:00+02:00',
    updatedAt: '2026-05-26T09:10:00+02:00',
  },
  {
    baseId: 'U100002',
    subjectType: 'user',
    displayName: '周亦辰',
    avatarText: '周',
    globalDescription: '新晋会员，近期活跃度上升，尚未形成明确车型偏好。',
    archive: [
      { key: 'name', label: '姓名', value: '周亦辰', permission: 'detailData' },
      { key: 'gender', label: '性别', value: '男', permission: 'userAttribute' },
      { key: 'age', label: '年龄', value: '27', permission: 'userAttribute' },
      { key: 'mobile', label: '手机号', value: '136****0291', permission: 'userAttribute', sensitive: true },
      { key: 'memberLevel', label: '会员等级', value: '银卡会员', permission: 'userAttribute' },
      { key: 'city', label: '城市', value: '杭州', permission: 'userAttribute' },
      { key: 'basicTags', label: '基础标签', value: '新客 / 活跃上升', permission: 'tagResource' },
    ],
    identities: [
      { idType: 'base_id', idTypeLabel: '基准 ID', value: 'U100002', maskedValue: 'U100002', isPrimary: true, masked: false, sensitive: false, copyable: true, source: 'ID Mapping', updatedAt: '2026-05-25T10:00:00+02:00' },
      { idType: 'member_id', idTypeLabel: '会员 ID', value: 'M782510', maskedValue: 'M782510', isPrimary: false, masked: false, sensitive: false, copyable: true, source: 'CRM', updatedAt: '2026-05-25T10:00:00+02:00' },
      { idType: 'mobile', idTypeLabel: '手机号', value: '13678090291', maskedValue: '136****0291', isPrimary: false, masked: true, sensitive: true, copyable: true, source: 'CRM', updatedAt: '2026-05-25T10:00:00+02:00' },
      { idType: 'device_id', idTypeLabel: '设备 ID', value: 'AID-7201-3349-CD81', maskedValue: 'AID-72****CD81', isPrimary: false, masked: true, sensitive: true, copyable: true, source: 'App SDK', updatedAt: '2026-05-25T22:41:00+02:00' },
    ],
    tags: [
      { ...commonTags.growthActive, value: '中活跃' },
      { ...commonTags.highValue, value: 'C' },
      { id: 'tag-new-member', name: '新晋会员', value: '是', type: '生命周期标签', categoryId: 'cat-growth', categoryName: '增长标签', groupId: 'growth', groupName: '增长', source: 'CRM', description: '注册 30 天内的新会员。', updatedAt: '2026-05-25T02:00:00+02:00', permission: true },
    ],
    segments: [
      { id: 'segment-new-active', name: '新客活跃提升', groupName: '增长运营', count: 183020, updatedAt: '2026-05-25T02:00:00+02:00', permission: true },
    ],
    overviewCards: [
      { id: 'spend', title: '近 30 天消费', value: '¥680', description: '完成首单，尚未复购。', updatedAt: '2026-05-25T12:00:00+02:00', permission: 'detailData' },
      { id: 'activity', title: '活跃评分', value: '64', description: '近 7 日访问 5 天。', updatedAt: '2026-05-25T22:40:00+02:00', permission: 'tagResource' },
      { id: 'leadIntent', title: '购车意向', value: '中', description: '浏览车型页面但未预约。', updatedAt: '2026-05-25T21:15:00+02:00', permission: 'behaviorResource' },
    ],
    journey: [
      { id: 'j1', name: '认知', status: 'done', time: '2026-05-20', description: '自然搜索进入官网。', details: [{ label: '来源', value: 'Web' }] },
      { id: 'j2', name: '兴趣', status: 'current', time: '2026-05-25', description: '浏览车型和权益页。', details: [{ label: '行为', value: '车型页浏览、权益页浏览' }] },
      { id: 'j3', name: '转化', status: 'pending', description: '尚未预约试驾。', details: [] },
    ],
    customValues: {
      mobile: '136****0291',
      memberLevel: '银卡会员',
      city: '杭州',
      activeScore: 64,
      valueLevel: 'C',
      lastBehavior: '权益页浏览 / Web / 2026-05-25 21:15',
      segmentNames: '新客活跃提升',
      deviceId: 'AID-72****CD81',
      lastOrderAmount: '¥680',
    },
    relationSummary: '关联 1 个设备和 1 个商品偏好。',
    createdAt: '2026-05-01T09:00:00+02:00',
    updatedAt: '2026-05-25T22:42:00+02:00',
  },
  {
    baseId: 'STORE-088',
    subjectType: 'store',
    displayName: '上海静安体验店',
    avatarText: '店',
    globalDescription: '核心城市门店，近期 SUV 试驾预约增长明显。',
    archive: [
      { key: 'name', label: '门店名称', value: '上海静安体验店', permission: 'detailData' },
      { key: 'city', label: '城市', value: '上海', permission: 'userAttribute' },
      { key: 'basicTags', label: '门店标签', value: '核心门店 / 高意向客流', permission: 'tagResource' },
    ],
    identities: [
      { idType: 'store_id', idTypeLabel: '门店 ID', value: 'STORE-088', maskedValue: 'STORE-088', isPrimary: true, masked: false, sensitive: false, copyable: true, source: '门店主数据', updatedAt: '2026-05-24T10:00:00+02:00' },
      { idType: 'area_id', idTypeLabel: '商圈 ID', value: 'AREA-SH-JA', maskedValue: 'AREA-SH-JA', isPrimary: false, masked: false, sensitive: false, copyable: true, source: '门店主数据', updatedAt: '2026-05-24T10:00:00+02:00' },
    ],
    tags: [
      { id: 'tag-store-tier', name: '门店等级', value: '核心', type: '属性标签', categoryId: 'cat-store', categoryName: '门店标签', groupId: 'store', groupName: '门店', source: '门店主数据', description: '按城市、客流和转化综合分层。', updatedAt: '2026-05-24T10:00:00+02:00', permission: true },
    ],
    segments: [
      { id: 'segment-core-store', name: '核心城市高转化门店', groupName: '门店联动', count: 128, updatedAt: '2026-05-24T02:00:00+02:00', permission: true },
    ],
    overviewCards: [
      { id: 'storeVisit', title: '近 7 日到店', value: '286', description: '较前 7 日增长 12%。', updatedAt: '2026-05-26T09:00:00+02:00', permission: 'detailData' },
      { id: 'leadIntent', title: '试驾预约', value: '42', description: 'SUV 车型占比 61%。', updatedAt: '2026-05-26T09:00:00+02:00', permission: 'behaviorResource' },
    ],
    journey: [],
    customValues: {
      city: '上海',
      valueLevel: '核心',
      lastBehavior: '试驾预约增长 / 2026-05-26',
    },
    relationSummary: '关联高意向用户 1,280 人、重点商品 12 个。',
    createdAt: '2024-03-01T09:00:00+02:00',
    updatedAt: '2026-05-26T09:00:00+02:00',
  },
  {
    baseId: 'VH-7791',
    subjectType: 'vehicle',
    displayName: '星曜 SUV 试驾车',
    avatarText: '车',
    globalDescription: '上海静安体验店试驾车，近期被高意向用户多次预约。',
    archive: [
      { key: 'name', label: '车辆名称', value: '星曜 SUV 试驾车', permission: 'detailData' },
      { key: 'basicTags', label: '车辆标签', value: '试驾车 / 中大型 SUV / 上海静安店', permission: 'tagResource' },
    ],
    identities: [
      { idType: 'vehicle_id', idTypeLabel: '车辆 ID', value: 'VH-7791', maskedValue: 'VH-7791', isPrimary: true, masked: false, sensitive: false, copyable: true, source: '车辆主数据', updatedAt: '2026-05-24T10:00:00+02:00' },
      { idType: 'vin', idTypeLabel: 'VIN', value: 'LXYZ7791SUV2026A1', maskedValue: 'LXYZ****26A1', isPrimary: false, masked: true, sensitive: true, copyable: true, source: '车辆主数据', updatedAt: '2026-05-24T10:00:00+02:00' },
    ],
    tags: [
      { id: 'tag-vehicle-model', name: '车型', value: '星曜 SUV', type: '属性标签', categoryId: 'cat-vehicle', categoryName: '车辆标签', groupId: 'vehicle', groupName: '车辆', source: '车辆主数据', description: '车辆车型。', updatedAt: '2026-05-24T10:00:00+02:00', permission: true },
      { id: 'tag-vehicle-status', name: '车辆状态', value: '试驾中', type: '状态标签', categoryId: 'cat-vehicle', categoryName: '车辆标签', groupId: 'vehicle', groupName: '车辆', source: '试驾系统', description: '当前车辆试驾状态。', updatedAt: '2026-05-25T20:10:00+02:00', permission: true },
    ],
    segments: [
      { id: 'segment-demo-vehicle', name: '高频试驾车辆', groupName: '门店联动', count: 96, updatedAt: '2026-05-25T20:10:00+02:00', permission: true },
    ],
    overviewCards: [
      { id: 'leadIntent', title: '近 7 日预约', value: '18', description: '静安店预约最多的试驾车型。', updatedAt: '2026-05-26T09:00:00+02:00', permission: 'behaviorResource' },
      { id: 'serviceRisk', title: '维保状态', value: '正常', description: '下次检查预计 14 天后。', updatedAt: '2026-05-25T18:00:00+02:00', permission: 'detailData' },
    ],
    journey: [
      { id: 'vh-j1', name: '入库', status: 'done', time: '2026-04-12', description: '车辆入库。', details: [] },
      { id: 'vh-j2', name: '试驾', status: 'current', time: '2026-05-25', description: '等待用户到店。', details: [{ label: '用户', value: '林小满' }] },
    ],
    customValues: {
      lastBehavior: '试驾预约 / 小程序 / 2026-05-25 20:10',
    },
    relationSummary: '关联用户林小满和上海静安体验店。',
    createdAt: '2026-04-12T09:00:00+02:00',
    updatedAt: '2026-05-25T20:10:00+02:00',
  },
  {
    baseId: 'SKU-SUV-X9',
    subjectType: 'product',
    displayName: '星曜 SUV',
    avatarText: '品',
    globalDescription: '高意向 SUV 商品，关联多名试驾用户和核心门店。',
    archive: [
      { key: 'name', label: '商品名称', value: '星曜 SUV', permission: 'detailData' },
      { key: 'basicTags', label: '商品标签', value: '中大型 SUV / 高意向 / 热门车型', permission: 'tagResource' },
    ],
    identities: [
      { idType: 'sku_id', idTypeLabel: 'SKU ID', value: 'SKU-SUV-X9', maskedValue: 'SKU-SUV-X9', isPrimary: true, masked: false, sensitive: false, copyable: true, source: '商品主数据', updatedAt: '2026-05-24T10:00:00+02:00' },
      { idType: 'spu_id', idTypeLabel: 'SPU ID', value: 'SPU-SUV-X', maskedValue: 'SPU-SUV-X', isPrimary: false, masked: false, sensitive: false, copyable: true, source: '商品主数据', updatedAt: '2026-05-24T10:00:00+02:00' },
    ],
    tags: [
      { id: 'tag-product-category', name: '商品类目', value: '中大型 SUV', type: '属性标签', categoryId: 'cat-product', categoryName: '商品标签', groupId: 'product', groupName: '商品', source: '商品主数据', description: '商品类目。', updatedAt: '2026-05-24T10:00:00+02:00', permission: true },
      { id: 'tag-product-intent', name: '意向热度', value: '高', type: '统计标签', categoryId: 'cat-value', categoryName: '价值标签', groupId: 'value', groupName: '价值', source: '行为偏好模型', description: '基于浏览、收藏、试驾预约和门店咨询综合计算。', updatedAt: '2026-05-25T18:42:00+02:00', permission: true },
      { id: 'tag-product-store', name: '重点转化门店', value: '上海静安体验店', type: '关系标签', categoryId: 'cat-store', categoryName: '门店标签', groupId: 'store', groupName: '门店', source: '试驾预约明细', description: '商品近期转化贡献最高的门店。', updatedAt: '2026-05-25T20:10:00+02:00', permission: true },
    ],
    segments: [
      { id: 'segment-hot-product', name: '高意向热门商品', groupName: '商品运营', count: 18, updatedAt: '2026-05-25T18:00:00+02:00', permission: true },
      { id: 'segment-store-product', name: '核心门店重点车型', groupName: '门店联动', count: 12, updatedAt: '2026-05-25T20:00:00+02:00', permission: true },
    ],
    overviewCards: [
      { id: 'leadIntent', title: '近 7 日意向用户', value: '1,284', description: '较前 7 日增长 16%。', updatedAt: '2026-05-26T09:00:00+02:00', permission: 'behaviorResource' },
      { id: 'storeVisit', title: '重点门店', value: '上海静安体验店', description: '试驾预约转化最高。', updatedAt: '2026-05-25T18:00:00+02:00', permission: 'detailData' },
    ],
    journey: [],
    customValues: {
      valueLevel: '高意向',
      lastBehavior: '商品详情浏览 / 微信 / 2026-05-25 18:42',
    },
    relationSummary: '关联用户林小满和上海静安体验店。',
    createdAt: '2026-03-01T09:00:00+02:00',
    updatedAt: '2026-05-25T18:42:00+02:00',
  },
  ...generatedUsers,
]

export const profileConditionCatalog: ProfileConditionCatalogItem[] = [
  { id: 'cond-active', source: 'tag', sourceName: '标签条件', field: 'activeScore', label: '活跃评分', defaultOperator: 'greater_equal', defaultValue: 60, timeRange: '最近 7 天', permission: 'tagResource', realtimeSupported: false },
  { id: 'cond-value', source: 'tag', sourceName: '标签条件', field: 'valueLevel', label: '价值等级', defaultOperator: 'in', defaultValue: ['A', 'B'], permission: 'tagResource', realtimeSupported: false },
  { id: 'cond-purchase', source: 'behavior', sourceName: '行为条件', field: 'order_submit', label: '最近 30 天提交订单次数', defaultOperator: 'greater_than', defaultValue: 0, timeRange: '最近 30 天', aggregate: '次数', permission: 'behaviorResource', realtimeSupported: true },
  { id: 'cond-store-view', source: 'behavior', sourceName: '行为条件', field: 'store_detail_view', label: '最近 14 天查看门店详情', defaultOperator: 'greater_equal', defaultValue: 1, timeRange: '最近 14 天', aggregate: '次数', permission: 'behaviorResource', realtimeSupported: true },
  { id: 'cond-city', source: 'attribute', sourceName: '用户属性', field: 'city', label: '城市', defaultOperator: 'in', defaultValue: ['上海', '杭州'], permission: 'userAttribute', realtimeSupported: true },
  { id: 'cond-order-amount', source: 'detail', sourceName: '明细数据', field: 'lastOrderAmount', label: '近 30 天消费金额', defaultOperator: 'greater_equal', defaultValue: 1000, timeRange: '最近 30 天', permission: 'detailData', realtimeSupported: false },
  { id: 'cond-segment', source: 'segment', sourceName: '已有分群', field: 'segment-low-coin-high-active', label: '属于低金币高活跃用户', defaultOperator: 'equals', defaultValue: '属于', permission: 'segmentView', realtimeSupported: false },
]

const behaviorEventTemplates = [
  ['ad_click', '广告点击', '认知触达', 'cat-awareness', '认知', 'Finder'],
  ['wechat_article_read', '微信文章阅读', '认知触达', 'cat-awareness', '兴趣', '微信'],
  ['gmp_sdk_logs', 'GMP触达', '认知触达', 'cat-awareness', '认知', 'GMP'],
  ['miniapp_browse', '小程序浏览', '兴趣互动', 'cat-interest', '兴趣', '小程序'],
  ['vehicle_config_view', '车型配置查看', '兴趣互动', 'cat-interest', '兴趣', 'Web'],
  ['store_detail_view', '门店详情查看', '兴趣互动', 'cat-interest', '兴趣', '小程序'],
  ['coupon_receive', '领券', '转化交易', 'cat-conversion', '转化', 'App'],
  ['test_drive_book', '试驾预约', '转化交易', 'cat-conversion', '转化', '小程序'],
  ['order_submit', '订单提交', '转化交易', 'cat-conversion', '转化', 'Web'],
] as const

const generatedBehaviorEvents: ProfileBehaviorEvent[] = [
  ...Array.from({ length: 64 }, (_, index) => {
    const [eventName, displayName, categoryName, categoryId, process, platform] = behaviorEventTemplates[index % behaviorEventTemplates.length]!
    const day = 1 + (index % 26)
    const hour = 8 + (index % 12)
    return {
      id: `event-u100001-generated-${index + 1}`,
      baseId: 'U100001',
      occurredAt: `2026-05-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}:00+02:00`,
      platform,
      process,
      categoryId,
      categoryName,
      eventName,
      displayName,
      source: `${platform} SDK`,
      summary: `${displayName}演示记录 ${index + 1}，用于验证时间线分组、事件筛选、属性筛选和加载更多。`,
      keyProperties: [
        { label: '车型', value: index % 2 ? '星曜 SUV' : '曜影轿跑' },
        { label: '渠道', value: platform },
      ],
      properties: [
        { field: 'task_id', label: '任务编号', value: `TASK-DEMO-${String(index + 1).padStart(3, '0')}`, rawValue: `TASK-DEMO-${String(index + 1).padStart(3, '0')}`, permission: true },
        { field: 'status_code', label: '状态码', value: index % 3 ? '成功' : '已点击', rawValue: index % 3 ? 'SUCCESS' : 'CLICKED', permission: true },
        { field: 'channel_type', label: '通道类型', value: platform, rawValue: platform, permission: true },
        { field: 'vehicle_model', label: '车型', value: index % 2 ? '星曜 SUV' : '曜影轿跑', rawValue: index % 2 ? 'SUV-X9' : 'CAR-Y7', permission: true },
        { field: 'user_agent', label: 'user_agent', value: '已过滤', rawValue: 'Mozilla/5.0 Demo', permission: false },
      ],
    }
  }),
  ...generatedUsers.slice(0, 18).map((user, index) => {
    const [eventName, displayName, categoryName, categoryId, process, platform] = behaviorEventTemplates[(index + 3) % behaviorEventTemplates.length]!
    return {
      id: `event-${user.baseId.toLowerCase()}-latest`,
      baseId: user.baseId,
      occurredAt: `2026-05-${String(8 + (index % 16)).padStart(2, '0')}T18:${String((index * 5) % 60).padStart(2, '0')}:00+02:00`,
      platform,
      process,
      categoryId,
      categoryName,
      eventName,
      displayName,
      source: `${platform} SDK`,
      summary: `${user.displayName} 最近一次 ${displayName}。`,
      keyProperties: [
        { label: '城市', value: String(user.customValues.city ?? '-') },
        { label: '会员等级', value: String(user.customValues.memberLevel ?? '-') },
      ],
      properties: [
        { field: 'status_code', label: '状态码', value: '成功', rawValue: 'SUCCESS', permission: true },
        { field: 'channel_type', label: '通道类型', value: platform, rawValue: platform, permission: true },
      ],
    }
  }),
]

export const profileBehaviorEvents: ProfileBehaviorEvent[] = [
  {
    id: 'event-1',
    baseId: 'U100001',
    occurredAt: '2026-05-25T20:10:00+02:00',
    platform: '小程序',
    process: '转化',
    categoryId: 'cat-conversion',
    categoryName: '转化交易',
    eventName: 'test_drive_book',
    displayName: '试驾预约',
    source: '小程序 SDK',
    summary: '预约上海静安体验店试驾中大型 SUV。',
    keyProperties: [
      { label: '门店', value: '上海静安体验店' },
      { label: '车型', value: '星曜 SUV' },
    ],
    properties: [
      { field: 'store_id', label: '门店ID', value: 'STORE-088', rawValue: 'STORE-088', permission: true },
      { field: 'vehicle_model', label: '车型', value: '星曜 SUV', rawValue: 'SUV-X9', permission: true },
      { field: 'status_code', label: '状态码', value: '预约成功', rawValue: 'SUCCESS', permission: true },
      { field: 'channel_type', label: '通道类型', value: '小程序', rawValue: 'miniapp', permission: true },
      { field: 'ip', label: 'IP 地址', value: '已过滤', rawValue: '10.0.0.1', permission: false },
    ],
  },
  {
    id: 'event-2',
    baseId: 'U100001',
    occurredAt: '2026-05-25T18:42:00+02:00',
    platform: '微信',
    process: '兴趣',
    categoryId: 'cat-interest',
    categoryName: '兴趣互动',
    eventName: 'wechat_article_read',
    displayName: '微信文章阅读',
    source: '微信公众号',
    summary: '阅读“中大型 SUV 长途试驾攻略”并停留 3 分 18 秒。',
    keyProperties: [
      { label: '文章', value: '长途试驾攻略' },
      { label: '停留时长', value: '198 秒' },
    ],
    properties: [
      { field: 'article_id', label: '文章编号', value: 'ART-9281', rawValue: 'ART-9281', permission: true },
      { field: 'duration', label: '停留时长', value: '198 秒', rawValue: '198', permission: true },
      { field: 'channel_id', label: '通道ID', value: '微信公众号', rawValue: 'wechat_mp', permission: true },
    ],
  },
  {
    id: 'event-3',
    baseId: 'U100001',
    occurredAt: '2026-05-24T09:16:00+02:00',
    platform: 'GMP',
    process: '认知',
    categoryId: 'cat-awareness',
    categoryName: '认知触达',
    eventName: 'gmp_sdk_logs',
    displayName: 'GMP触达',
    source: 'GMP',
    summary: '触达 SUV 专题活动短信并完成点击。',
    keyProperties: [
      { label: '任务编号', value: 'TASK-20260524' },
      { label: '任务类型', value: '短信触达' },
    ],
    properties: [
      { field: 'task_id', label: '任务编号', value: 'TASK-20260524', rawValue: 'TASK-20260524', permission: true },
      { field: 'task_type', label: '任务类型', value: '短信触达', rawValue: 'sms', permission: true },
      { field: 'send_id', label: '发送ID', value: 'SEND-8842', rawValue: 'SEND-8842', permission: true },
      { field: 'status_code', label: '状态码', value: '已点击', rawValue: 'CLICKED', permission: true },
    ],
  },
  {
    id: 'event-4',
    baseId: 'U100002',
    occurredAt: '2026-05-25T21:15:00+02:00',
    platform: 'Web',
    process: '兴趣',
    categoryId: 'cat-interest',
    categoryName: '兴趣互动',
    eventName: 'miniapp_browse',
    displayName: '权益页浏览',
    source: 'Web SDK',
    summary: '浏览会员权益页，停留 96 秒。',
    keyProperties: [
      { label: '页面', value: '会员权益' },
      { label: '停留时长', value: '96 秒' },
    ],
    properties: [
      { field: 'page_name', label: '页面名称', value: '会员权益', rawValue: 'member_benefit', permission: true },
      { field: 'duration', label: '停留时长', value: '96 秒', rawValue: '96', permission: true },
    ],
  },
  {
    id: 'event-vh-1',
    baseId: 'VH-7791',
    occurredAt: '2026-05-25T20:10:00+02:00',
    platform: '门店系统',
    process: '试驾',
    categoryId: 'cat-vehicle-usage',
    categoryName: '试驾使用',
    eventName: 'test_drive_book',
    displayName: '试驾预约',
    source: '门店试驾系统',
    summary: '林小满预约上海静安体验店星曜 SUV 试驾车。',
    keyProperties: [
      { label: '预约用户', value: '林小满' },
      { label: '门店', value: '上海静安体验店' },
    ],
    properties: [
      { field: 'user_base_id', label: '用户基准 ID', value: 'U100001', rawValue: 'U100001', permission: true },
      { field: 'store_id', label: '门店 ID', value: 'STORE-088', rawValue: 'STORE-088', permission: true },
      { field: 'status_code', label: '状态码', value: '预约成功', rawValue: 'SUCCESS', permission: true },
    ],
  },
  {
    id: 'event-vh-2',
    baseId: 'VH-7791',
    occurredAt: '2026-05-24T18:00:00+02:00',
    platform: '门店系统',
    process: '维保',
    categoryId: 'cat-vehicle-service',
    categoryName: '车辆维保',
    eventName: 'vehicle_check',
    displayName: '车辆检查',
    source: '门店维保系统',
    summary: '试驾车完成例行检查，状态正常。',
    keyProperties: [
      { label: '检查结果', value: '正常' },
      { label: '下次检查', value: '14 天后' },
    ],
    properties: [
      { field: 'check_result', label: '检查结果', value: '正常', rawValue: 'PASS', permission: true },
      { field: 'next_check_days', label: '下次检查天数', value: '14', rawValue: '14', permission: true },
      { field: 'status_code', label: '状态码', value: '完成', rawValue: 'DONE', permission: true },
    ],
  },
  ...generatedBehaviorEvents,
]

const identitiesOf = (baseId: EntityId): ProfileIndividual['identities'] => profileIndividuals.find((individual) => individual.baseId === baseId)?.identities ?? []

export const profileRelationGraphs: Record<string, ProfileRelationGraph> = {
  U100001: {
    enabled: true,
    nodes: [
      { id: 'node-user', subjectType: 'user', subjectName: '用户', idType: 'base_id', idValue: 'U100001', label: '林小满', color: '#2563eb', x: 50, y: 50 },
      { id: 'node-store', subjectType: 'store', subjectName: '门店', idType: 'store_id', idValue: 'STORE-088', label: '上海静安体验店', color: '#16a34a', x: 26, y: 20 },
      { id: 'node-vehicle', subjectType: 'vehicle', subjectName: '车辆', idType: 'vehicle_id', idValue: 'VH-7791', label: '星曜 SUV 试驾车', color: '#9333ea', x: 74, y: 22 },
      { id: 'node-product', subjectType: 'product', subjectName: '商品', idType: 'sku_id', idValue: 'SKU-SUV-X9', label: '星曜 SUV', color: '#ea580c', x: 72, y: 78 },
    ],
    edges: [
      { id: 'edge-store', source: 'node-user', target: 'node-store', relationName: '最近到访门店', sourceName: 'ID Mapping 主体转换', updatedAt: '2026-05-25T20:10:00+02:00', relationId: 'rel-user-store' },
      { id: 'edge-vehicle', source: 'node-user', target: 'node-vehicle', relationName: '预约试驾车辆', sourceName: '试驾预约明细', updatedAt: '2026-05-25T20:10:00+02:00', relationId: 'rel-user-vehicle' },
      { id: 'edge-product', source: 'node-user', target: 'node-product', relationName: '高意向商品', sourceName: '行为偏好模型', updatedAt: '2026-05-25T18:42:00+02:00', relationId: 'rel-user-product' },
    ],
    tableRows: [
      { id: 'rel-row-store', subjectType: 'store', subjectName: '门店', idType: 'store_id', idValue: 'STORE-088', maskedValue: 'STORE-088', relationName: '最近到访门店', keyTags: ['核心门店'], keyAttributes: ['上海', '试驾预约 42'], updatedAt: '2026-05-25T20:10:00+02:00', viewable: true, copyable: true },
      { id: 'rel-row-vehicle', subjectType: 'vehicle', subjectName: '车辆', idType: 'vehicle_id', idValue: 'VH-7791', maskedValue: 'VH-7791', relationName: '预约试驾车辆', keyTags: ['中大型 SUV'], keyAttributes: ['试驾中', '上海静安店'], updatedAt: '2026-05-25T20:10:00+02:00', viewable: true, copyable: true },
      { id: 'rel-row-product', subjectType: 'product', subjectName: '商品', idType: 'sku_id', idValue: 'SKU-SUV-X9', maskedValue: 'SKU-SUV-X9', relationName: '高意向商品', keyTags: ['SUV 车型'], keyAttributes: ['浏览 6 次', '收藏 1 次'], updatedAt: '2026-05-25T18:42:00+02:00', viewable: true, copyable: true },
    ],
    identities: identitiesOf('U100001'),
  },
  U100002: {
    enabled: true,
    nodes: [
      { id: 'node-user-2', subjectType: 'user', subjectName: '用户', idType: 'base_id', idValue: 'U100002', label: '周亦辰', color: '#2563eb', x: 50, y: 50 },
      { id: 'node-product-2', subjectType: 'product', subjectName: '商品', idType: 'sku_id', idValue: 'SKU-BENEFIT-01', label: '会员权益包', color: '#ea580c', x: 72, y: 34 },
    ],
    edges: [
      { id: 'edge-product-2', source: 'node-user-2', target: 'node-product-2', relationName: '近期浏览商品', sourceName: '行为偏好模型', updatedAt: '2026-05-25T21:15:00+02:00', relationId: 'rel-user-product' },
    ],
    tableRows: [
      { id: 'rel-row-product-2', subjectType: 'product', subjectName: '商品', idType: 'sku_id', idValue: 'SKU-BENEFIT-01', maskedValue: 'SKU-BENEFIT-01', relationName: '近期浏览商品', keyTags: ['会员权益'], keyAttributes: ['浏览 2 次'], updatedAt: '2026-05-25T21:15:00+02:00', viewable: false, copyable: true },
    ],
    identities: identitiesOf('U100002'),
  },
  'STORE-088': {
    enabled: true,
    nodes: [
      { id: 'node-store-center', subjectType: 'store', subjectName: '门店', idType: 'store_id', idValue: 'STORE-088', label: '上海静安体验店', color: '#16a34a', x: 50, y: 50 },
      { id: 'node-store-user', subjectType: 'user', subjectName: '用户', idType: 'base_id', idValue: 'U100001', label: '林小满', color: '#2563eb', x: 25, y: 28 },
      { id: 'node-store-vehicle', subjectType: 'vehicle', subjectName: '车辆', idType: 'vehicle_id', idValue: 'VH-7791', label: '星曜 SUV 试驾车', color: '#9333ea', x: 76, y: 26 },
      { id: 'node-store-product', subjectType: 'product', subjectName: '商品', idType: 'sku_id', idValue: 'SKU-SUV-X9', label: '星曜 SUV', color: '#ea580c', x: 73, y: 78 },
    ],
    edges: [
      { id: 'edge-store-user', source: 'node-store-center', target: 'node-store-user', relationName: '近期到访用户', sourceName: '门店到访明细', updatedAt: '2026-05-25T20:10:00+02:00', relationId: 'rel-store-user' },
      { id: 'edge-store-vehicle', source: 'node-store-center', target: 'node-store-vehicle', relationName: '在店试驾车辆', sourceName: '车辆主数据', updatedAt: '2026-05-24T10:00:00+02:00', relationId: 'rel-store-vehicle' },
      { id: 'edge-store-product', source: 'node-store-center', target: 'node-store-product', relationName: '重点转化商品', sourceName: '商品转化模型', updatedAt: '2026-05-25T18:42:00+02:00', relationId: 'rel-store-product' },
    ],
    tableRows: [
      { id: 'rel-store-user-row', subjectType: 'user', subjectName: '用户', idType: 'base_id', idValue: 'U100001', maskedValue: 'U100001', relationName: '近期到访用户', keyTags: ['高价值', 'SUV 高意向'], keyAttributes: ['试驾预约', '黑金会员'], updatedAt: '2026-05-25T20:10:00+02:00', viewable: true, copyable: true },
      { id: 'rel-store-vehicle-row', subjectType: 'vehicle', subjectName: '车辆', idType: 'vehicle_id', idValue: 'VH-7791', maskedValue: 'VH-7791', relationName: '在店试驾车辆', keyTags: ['试驾中'], keyAttributes: ['星曜 SUV', '14 天后检查'], updatedAt: '2026-05-24T10:00:00+02:00', viewable: true, copyable: true },
      { id: 'rel-store-product-row', subjectType: 'product', subjectName: '商品', idType: 'sku_id', idValue: 'SKU-SUV-X9', maskedValue: 'SKU-SUV-X9', relationName: '重点转化商品', keyTags: ['高意向商品'], keyAttributes: ['预约 42', '意向用户 1,284'], updatedAt: '2026-05-25T18:42:00+02:00', viewable: true, copyable: true },
    ],
    identities: identitiesOf('STORE-088'),
  },
  'VH-7791': {
    enabled: true,
    nodes: [
      { id: 'node-vehicle-center', subjectType: 'vehicle', subjectName: '车辆', idType: 'vehicle_id', idValue: 'VH-7791', label: '星曜 SUV 试驾车', color: '#9333ea', x: 50, y: 50 },
      { id: 'node-vehicle-user', subjectType: 'user', subjectName: '用户', idType: 'base_id', idValue: 'U100001', label: '林小满', color: '#2563eb', x: 27, y: 28 },
      { id: 'node-vehicle-store', subjectType: 'store', subjectName: '门店', idType: 'store_id', idValue: 'STORE-088', label: '上海静安体验店', color: '#16a34a', x: 75, y: 28 },
      { id: 'node-vehicle-product', subjectType: 'product', subjectName: '商品', idType: 'sku_id', idValue: 'SKU-SUV-X9', label: '星曜 SUV', color: '#ea580c', x: 50, y: 80 },
    ],
    edges: [
      { id: 'edge-vehicle-user', source: 'node-vehicle-center', target: 'node-vehicle-user', relationName: '预约试驾用户', sourceName: '试驾预约明细', updatedAt: '2026-05-25T20:10:00+02:00', relationId: 'rel-vehicle-user' },
      { id: 'edge-vehicle-store', source: 'node-vehicle-center', target: 'node-vehicle-store', relationName: '所属门店', sourceName: '车辆主数据', updatedAt: '2026-05-24T10:00:00+02:00', relationId: 'rel-vehicle-store' },
      { id: 'edge-vehicle-product', source: 'node-vehicle-center', target: 'node-vehicle-product', relationName: '对应车型商品', sourceName: '商品主数据', updatedAt: '2026-05-24T10:00:00+02:00', relationId: 'rel-vehicle-product' },
    ],
    tableRows: [
      { id: 'rel-vehicle-user-row', subjectType: 'user', subjectName: '用户', idType: 'base_id', idValue: 'U100001', maskedValue: 'U100001', relationName: '预约试驾用户', keyTags: ['高意向'], keyAttributes: ['2026-05-25 20:10', '上海'], updatedAt: '2026-05-25T20:10:00+02:00', viewable: true, copyable: true },
      { id: 'rel-vehicle-store-row', subjectType: 'store', subjectName: '门店', idType: 'store_id', idValue: 'STORE-088', maskedValue: 'STORE-088', relationName: '所属门店', keyTags: ['核心门店'], keyAttributes: ['上海静安', '预约 42'], updatedAt: '2026-05-24T10:00:00+02:00', viewable: true, copyable: true },
      { id: 'rel-vehicle-product-row', subjectType: 'product', subjectName: '商品', idType: 'sku_id', idValue: 'SKU-SUV-X9', maskedValue: 'SKU-SUV-X9', relationName: '对应车型商品', keyTags: ['中大型 SUV'], keyAttributes: ['高意向', '热门车型'], updatedAt: '2026-05-24T10:00:00+02:00', viewable: true, copyable: true },
    ],
    identities: identitiesOf('VH-7791'),
  },
  'SKU-SUV-X9': {
    enabled: true,
    nodes: [
      { id: 'node-product-center', subjectType: 'product', subjectName: '商品', idType: 'sku_id', idValue: 'SKU-SUV-X9', label: '星曜 SUV', color: '#ea580c', x: 50, y: 50 },
      { id: 'node-product-user', subjectType: 'user', subjectName: '用户', idType: 'base_id', idValue: 'U100001', label: '林小满', color: '#2563eb', x: 27, y: 28 },
      { id: 'node-product-store', subjectType: 'store', subjectName: '门店', idType: 'store_id', idValue: 'STORE-088', label: '上海静安体验店', color: '#16a34a', x: 74, y: 30 },
      { id: 'node-product-vehicle', subjectType: 'vehicle', subjectName: '车辆', idType: 'vehicle_id', idValue: 'VH-7791', label: '星曜 SUV 试驾车', color: '#9333ea', x: 50, y: 80 },
    ],
    edges: [
      { id: 'edge-product-user', source: 'node-product-center', target: 'node-product-user', relationName: '高意向用户', sourceName: '行为偏好模型', updatedAt: '2026-05-25T18:42:00+02:00', relationId: 'rel-product-user' },
      { id: 'edge-product-store', source: 'node-product-center', target: 'node-product-store', relationName: '重点转化门店', sourceName: '试驾预约明细', updatedAt: '2026-05-25T20:10:00+02:00', relationId: 'rel-product-store' },
      { id: 'edge-product-vehicle', source: 'node-product-center', target: 'node-product-vehicle', relationName: '试驾车辆', sourceName: '车辆主数据', updatedAt: '2026-05-24T10:00:00+02:00', relationId: 'rel-product-vehicle' },
    ],
    tableRows: [
      { id: 'rel-product-user-row', subjectType: 'user', subjectName: '用户', idType: 'base_id', idValue: 'U100001', maskedValue: 'U100001', relationName: '高意向用户', keyTags: ['黑金会员', '高活跃'], keyAttributes: ['浏览 6 次', '收藏 1 次'], updatedAt: '2026-05-25T18:42:00+02:00', viewable: true, copyable: true },
      { id: 'rel-product-store-row', subjectType: 'store', subjectName: '门店', idType: 'store_id', idValue: 'STORE-088', maskedValue: 'STORE-088', relationName: '重点转化门店', keyTags: ['核心门店'], keyAttributes: ['试驾预约 42', '上海'], updatedAt: '2026-05-25T20:10:00+02:00', viewable: true, copyable: true },
      { id: 'rel-product-vehicle-row', subjectType: 'vehicle', subjectName: '车辆', idType: 'vehicle_id', idValue: 'VH-7791', maskedValue: 'VH-7791', relationName: '试驾车辆', keyTags: ['试驾中'], keyAttributes: ['门店系统', '状态正常'], updatedAt: '2026-05-24T10:00:00+02:00', viewable: true, copyable: true },
    ],
    identities: identitiesOf('SKU-SUV-X9'),
  },
}

export const profileAuditLogs: ProfileAuditLog[] = [
  {
    userId: currentUser.id,
    action: 'search',
    subjectType: 'user',
    idType: 'mobile',
    idValueMasked: '138****2678',
    boardId: 'board-user-growth',
    timestamp: '2026-05-26T09:20:00+02:00',
    resultCount: 1,
    ip: '127.0.0.1',
  },
]
