import type { SelectOption } from 'naive-ui'
import type { EntityId } from '@/types/common'
import type { TagCreatePayload, TagRuleGroup, TagValueType } from '@/types/tag'

export const dateRangeOptions = [
  '今天',
  '昨天',
  '最近 7 天，包含今天',
  '最近 30 天，不包含今天',
  '本周',
  '本月',
  '最近 180 天，不包含今天',
  '固定日期 2026-05-01 至 2026-05-25',
].map((value) => ({ label: value, value }))

export const behaviorPathOptions = [
  'App 启动 > 浏览详情 > 留资',
  '广告曝光 > 点击广告 > 预约试驾',
  '浏览车系 > 收藏车系 > 到店',
  '支付订单 > 售后服务',
].map((value) => ({ label: value, value }))

export const ruleSourceOptions = [
  { label: '行为事件表', value: 'behavior' },
  { label: '业务明细表', value: 'detail' },
  { label: '用户属性表', value: 'attribute' },
  { label: '已有标签', value: 'tag' },
]

export const dataSourceOptions = [
  { label: '行为事件表', value: '行为事件表' },
  { label: '订单明细表', value: '订单明细表' },
  { label: '会员主数据表', value: '会员主数据表' },
  { label: '用户属性宽表', value: '用户属性宽表' },
]

export const eventOptions = ['App 启动', '浏览商品详情页', '提交留资', '预约试驾', '支付订单', '售后服务'].map((value) => ({ label: value, value }))
export const detailTableOptions = ['订单明细表', '线索明细表', '试驾明细表', '售后工单表'].map((value) => ({ label: value, value }))
export const attributeTableOptions = ['用户属性宽表', '会员主数据表', '车辆归属表'].map((value) => ({ label: value, value }))

export const aggregateMethodOptions = ['总次数', '天数', '连续天数', '去重计数', '求和', '平均值', '最大值', '最小值'].map((value) => ({ label: value, value }))
export const compareOperatorOptions = ['大于', '大于等于', '等于', '小于等于', '小于'].map((value) => ({ label: value, value }))

export const outputModeOptions = [
  { label: '具体时间点', value: 'event_time' },
  { label: '距今天数', value: 'days_since' },
  { label: '事件/明细属性', value: 'attribute' },
]

export const preferenceMetricOptions = [
  { label: '出现次数最多', value: 'count_most' },
  { label: '数值最大', value: 'numeric_max' },
  { label: '求和最高', value: 'sum' },
  { label: '平均值最高', value: 'average' },
]

export const preferenceFieldOptions = [
  { label: '车系', value: 'car_series' },
  { label: '品类', value: 'category' },
  { label: '城市', value: 'city' },
  { label: '品牌', value: 'brand' },
]

export const timeFieldOptions = [
  { label: '事件时间 event_time', value: 'event_time' },
  { label: '订单支付时间 pay_time', value: 'pay_time' },
  { label: '创建时间 created_at', value: 'created_at' },
]

export const fieldOptions = [
  { id: 'manual_gender', name: '性别-人工', valueType: 'text' as TagValueType },
  { id: 'model_gender', name: '性别-推断', valueType: 'text' as TagValueType },
  { id: 'profile_gender', name: '性别-注册资料', valueType: 'text' as TagValueType },
  { id: 'member_level', name: '会员等级', valueType: 'text' as TagValueType },
  { id: 'birthday', name: '生日', valueType: 'date' as TagValueType },
  { id: 'last_login_time', name: '最近登录时间', valueType: 'datetime' as TagValueType },
  { id: 'used_credit', name: '动用金额', valueType: 'decimal' as TagValueType },
  { id: 'credit_limit', name: '授信额度', valueType: 'decimal' as TagValueType },
  { id: 'last_pay_days', name: '最近消费距今天数', valueType: 'integer' as TagValueType },
  { id: 'order_count', name: '购买频率', valueType: 'integer' as TagValueType },
  { id: 'pay_amount', name: '消费金额', valueType: 'decimal' as TagValueType },
]

export const fieldSelectOptions = fieldOptions.map((field) => ({ label: field.name, value: field.id }))

export const rfmSourceOptions = [
  { label: '明细数据', value: 'detail' },
  { label: '属性数据', value: 'attribute' },
  { label: '已有标签', value: 'tag' },
]

export const rfmCompareOptions = [
  { label: '平均值', value: 'average' },
  { label: '中位数', value: 'median' },
  { label: '自定义阈值', value: 'custom' },
]

export const importSourceFields = [
  { sourceField: 'level', sourceType: 'string', label: '会员等级', valueType: 'text' as TagValueType },
  { sourceField: 'city', sourceType: 'string', label: '会员城市', valueType: 'text' as TagValueType },
  { sourceField: 'age', sourceType: 'integer', label: '年龄', valueType: 'integer' as TagValueType },
  { sourceField: 'last_pay_date', sourceType: 'date', label: '最近消费日期', valueType: 'date' as TagValueType },
  { sourceField: 'total_amount', sourceType: 'decimal', label: '累计消费金额', valueType: 'decimal' as TagValueType },
]

export const tagValueTypeShortLabels: Record<TagValueType, string> = {
  text: '文本',
  integer: '整数',
  decimal: '小数',
  multi_text: '多值文本',
  multi_integer: '多值整数',
  multi_decimal: '多值小数',
  date: '日期',
  datetime: '日期时间',
  multi_date: '多值日期',
  multi_datetime: '多值日期时间',
}

export const emptyRuleGroup = (prefix: string): TagRuleGroup => ({
  id: `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
  logic: 'and',
  conditions: [],
  groups: [],
})

export const ensureRuleGroup = (draft: TagCreatePayload, key: 'filterGroup' | 'excludeGroup', prefix: string): TagRuleGroup => {
  draft.rule[key] ??= emptyRuleGroup(prefix)
  return draft.rule[key] as TagRuleGroup
}

export const selectOptionsFromFields = (): SelectOption[] => fieldSelectOptions

export const selectedFieldIds = (fields?: Array<{ id: EntityId }>): Set<EntityId> => new Set((fields ?? []).map((field) => field.id))
