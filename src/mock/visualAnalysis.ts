import type {
  AnnouncementConfig,
  DatasetOption,
  PaletteConfig,
  VisualField,
} from '@/types/visualAnalysis'

const permission = {
  editable: true,
  deletable: false,
  canSetAlias: true,
  canSetGeoRole: true,
}

const readonlyPermission = {
  editable: false,
  deletable: false,
  canSetAlias: false,
  canSetGeoRole: false,
}

const field = (
  datasetId: string,
  id: string,
  name: string,
  displayName: string,
  fieldType: VisualField['fieldType'],
  dataType: VisualField['dataType'],
  source: VisualField['source'] = 'dataset',
  semanticType: VisualField['semanticType'] = 'normal',
): VisualField => ({
  id,
  datasetId,
  name,
  displayName,
  fieldType,
  dataType,
  semanticType,
  source,
  aggregation: fieldType === 'measure' ? 'sum' : undefined,
  dateGranularity: dataType === 'date' || dataType === 'datetime' ? 'day' : undefined,
  permission: source === 'dataset' ? permission : { ...permission, deletable: true },
})

export const visualDatasets: DatasetOption[] = [
  {
    id: 'ds_ad_watch_detail',
    name: '广告观看明细数据集',
    description: '广告观看完成、广告位、收益和用户画像联合数据，用于运营监控和漏斗分析。',
    ownerName: 'Chaoyang Xu',
    lastVisitedAt: '2026-05-24 09:30:00',
    updatedAt: '2026-05-22 09:10:00',
    accessMode: 'extract',
    fieldCount: 18,
    rowCount: 18_642_000,
    permission: 'edit',
  },
  {
    id: 'ds_payment_success',
    name: '支付成功订单数据集',
    description: '支付成功订单明细，用于收入、成本、城市和渠道分析。',
    ownerName: 'Chaoyang Xu',
    lastVisitedAt: '2026-05-23 17:20:00',
    updatedAt: '2026-05-22 07:40:00',
    accessMode: 'extract',
    fieldCount: 16,
    rowCount: 3_460_000,
    permission: 'edit',
  },
  {
    id: 'theme_data_insight_event_wide',
    name: '数据洞察事件宽表',
    description: '数据洞察模块沉淀的事件宽表主题数据集，只读。',
    ownerName: '数据洞察系统',
    lastVisitedAt: '2026-05-21 10:08:00',
    updatedAt: '2026-05-22 06:10:00',
    accessMode: 'direct',
    fieldCount: 20,
    rowCount: 98_260_000,
    permission: 'view',
  },
]

export const visualFieldsByDataset: Record<string, VisualField[]> = {
  ds_ad_watch_detail: [
    field('ds_ad_watch_detail', 'f_event_date', 'event_date', '事件日期', 'dimension', 'date', 'dataset', 'date'),
    field('ds_ad_watch_detail', 'f_event_time', 'event_time', '事件时间', 'dimension', 'datetime', 'dataset', 'date'),
    field('ds_ad_watch_detail', 'f_province', 'province', '省份', 'dimension', 'geo', 'dataset', 'geo'),
    field('ds_ad_watch_detail', 'f_city', 'city', '城市', 'dimension', 'geo', 'dataset', 'geo'),
    field('ds_ad_watch_detail', 'f_channel', 'channel', '渠道', 'dimension', 'string'),
    field('ds_ad_watch_detail', 'f_ad_position', 'ad_position', '广告位', 'dimension', 'string'),
    field('ds_ad_watch_detail', 'f_game_type', 'game_type', '游戏类型', 'dimension', 'string'),
    field('ds_ad_watch_detail', 'f_funnel_stage', 'funnel_stage', '漏斗阶段', 'dimension', 'string'),
    field('ds_ad_watch_detail', 'f_keyword', 'keyword', '搜索词', 'dimension', 'string'),
    field('ds_ad_watch_detail', 'f_pay_status', 'payment_status', '付费状态', 'dimension', 'string'),
    field('ds_ad_watch_detail', 'f_coin_level', 'coin_balance_level', '金币余额等级', 'dimension', 'string'),
    field('ds_ad_watch_detail', 'f_revenue', 'revenue', '广告收益', 'measure', 'number'),
    field('ds_ad_watch_detail', 'f_watch_count', 'watch_count', '广告观看次数', 'measure', 'number'),
    field('ds_ad_watch_detail', 'f_active_uv', 'active_uv', '活跃用户数', 'measure', 'number'),
    field('ds_ad_watch_detail', 'f_conversion_rate', 'conversion_rate', '转化率', 'measure', 'number'),
    field('ds_ad_watch_detail', 'f_cost', 'cost_amount', '广告消耗', 'measure', 'number'),
    field('ds_ad_watch_detail', 'f_target', 'target_revenue', '目标收益', 'measure', 'number'),
    field('ds_ad_watch_detail', 'f_change', 'net_change', '净变化', 'measure', 'number'),
  ],
  ds_payment_success: [
    field('ds_payment_success', 'p_pay_date', 'pay_date', '支付日期', 'dimension', 'date', 'dataset', 'date'),
    field('ds_payment_success', 'p_order_id', 'order_id', '订单 ID', 'dimension', 'string'),
    field('ds_payment_success', 'p_user_id', 'user_id', '用户 ID', 'dimension', 'string'),
    field('ds_payment_success', 'p_province', 'province', '省份', 'dimension', 'geo', 'dataset', 'geo'),
    field('ds_payment_success', 'p_city', 'city', '城市', 'dimension', 'geo', 'dataset', 'geo'),
    field('ds_payment_success', 'p_channel', 'channel', '渠道', 'dimension', 'string'),
    field('ds_payment_success', 'p_pay_status', 'pay_status', '支付状态', 'dimension', 'string'),
    field('ds_payment_success', 'p_product', 'product_category', '商品品类', 'dimension', 'string'),
    field('ds_payment_success', 'p_device_os', 'device_os', '设备系统', 'dimension', 'string'),
    field('ds_payment_success', 'p_user_segment', 'user_segment', '用户分层', 'dimension', 'string'),
    field('ds_payment_success', 'p_amount', 'pay_amount', '支付金额', 'measure', 'number'),
    field('ds_payment_success', 'p_orders', 'order_count', '订单数', 'measure', 'number'),
    field('ds_payment_success', 'p_users', 'pay_users', '支付用户数', 'measure', 'number'),
    field('ds_payment_success', 'p_refund', 'refund_amount', '退款金额', 'measure', 'number'),
    field('ds_payment_success', 'p_coupon', 'coupon_amount', '优惠金额', 'measure', 'number'),
    field('ds_payment_success', 'p_target', 'target_amount', '目标金额', 'measure', 'number'),
  ],
  theme_data_insight_event_wide: [
    field('theme_data_insight_event_wide', 't_dt', 'dt', '日期', 'dimension', 'date', 'dataset', 'date'),
    field('theme_data_insight_event_wide', 't_event', 'event_name', '事件名称', 'dimension', 'string'),
    field('theme_data_insight_event_wide', 't_scene', 'scene_name', '场景', 'dimension', 'string'),
    field('theme_data_insight_event_wide', 't_version', 'app_version', 'App 版本', 'dimension', 'string'),
    field('theme_data_insight_event_wide', 't_country', 'country', '国家', 'dimension', 'geo', 'dataset', 'geo'),
    field('theme_data_insight_event_wide', 't_province', 'province', '省份', 'dimension', 'geo', 'dataset', 'geo'),
    field('theme_data_insight_event_wide', 't_city', 'city', '城市', 'dimension', 'geo', 'dataset', 'geo'),
    field('theme_data_insight_event_wide', 't_platform', 'platform', '平台', 'dimension', 'string'),
    field('theme_data_insight_event_wide', 't_device_os', 'device_os', '设备系统', 'dimension', 'string'),
    field('theme_data_insight_event_wide', 't_channel', 'channel', '渠道', 'dimension', 'string'),
    field('theme_data_insight_event_wide', 't_experiment', 'experiment_group', '实验分组', 'dimension', 'string'),
    field('theme_data_insight_event_wide', 't_retention_bucket', 'retention_bucket', '留存分层', 'dimension', 'string'),
    field('theme_data_insight_event_wide', 't_uv', 'event_uv', '事件用户数', 'measure', 'number'),
    field('theme_data_insight_event_wide', 't_pv', 'event_pv', '事件次数', 'measure', 'number'),
    field('theme_data_insight_event_wide', 't_duration', 'avg_duration', '平均停留时长', 'measure', 'number'),
    field('theme_data_insight_event_wide', 't_click_rate', 'click_rate', '点击率', 'measure', 'number'),
    field('theme_data_insight_event_wide', 't_error_count', 'error_count', '错误次数', 'measure', 'number'),
    field('theme_data_insight_event_wide', 't_crash_rate', 'crash_rate', '崩溃率', 'measure', 'number'),
    field('theme_data_insight_event_wide', 't_target_uv', 'target_uv', '目标用户数', 'measure', 'number'),
    field('theme_data_insight_event_wide', 't_net_change', 'net_change', '净变化', 'measure', 'number'),
  ].map((item) => ({ ...item, permission: readonlyPermission })),
}

const dates = Array.from({ length: 20 }, (_, index) => `2026-05-${String(index + 1).padStart(2, '0')}`)
const provinces = ['上海', '浙江', '广东', '北京', '四川', '江苏']
const cities = ['上海', '杭州', '广州', '北京', '成都', '南京']
const channels = ['自然流量', '巨量引擎', '腾讯广告', '小红书', 'B 站']
const positions = ['激励视频', '开屏', '信息流', '插屏']
const games = ['消除', '模拟经营', '卡牌', '休闲竞技']
const payStatus = ['未付费', '首购', '复购']
const coinLevels = ['低金币', '中金币', '高金币']
const products = ['会员订阅', '道具礼包', '金币包', '活动通行证']
const funnelStages = ['访问', '广告展示', '广告点击', '完成观看', '转化']
const keywords = ['金币不足', '复活道具', '限时礼包', '免费奖励', '高价值用户', '活动入口']
const devices = ['iOS', 'Android', 'HarmonyOS']
const segments = ['新用户', '活跃用户', '沉默召回', '高价值用户']
const platforms = ['App', '小程序', 'H5']
const experiments = ['A 组', 'B 组', '基线组']
const retentions = ['D1 留存', 'D7 留存', 'D30 留存']

export const visualRowsByDataset: Record<string, Array<Record<string, string | number | boolean | null>>> = {
  ds_ad_watch_detail: Array.from({ length: 96 }, (_, index) => {
    const cityIndex = index % cities.length
    const dayIndex = index % dates.length
    const base = 1200 + dayIndex * 48 + cityIndex * 92
    return {
      event_date: dates[dayIndex] ?? '2026-05-01',
      event_time: `${dates[dayIndex] ?? '2026-05-01'} ${String(8 + (index % 10)).padStart(2, '0')}:30:00`,
      province: provinces[cityIndex] ?? '上海',
      city: cities[cityIndex] ?? '上海',
      channel: channels[index % channels.length] ?? '自然流量',
      ad_position: positions[index % positions.length] ?? '激励视频',
      game_type: games[index % games.length] ?? '消除',
      funnel_stage: funnelStages[index % funnelStages.length] ?? '访问',
      keyword: keywords[index % keywords.length] ?? '金币不足',
      payment_status: payStatus[index % payStatus.length] ?? '未付费',
      coin_balance_level: coinLevels[index % coinLevels.length] ?? '低金币',
      revenue: Math.round(base * (1.2 + (index % 5) * 0.16)),
      watch_count: Math.round(base * 7.4 + (index % 4) * 860),
      active_uv: Math.round(base * 3.2 + (index % 5) * 230),
      conversion_rate: Number((0.08 + (index % 7) * 0.011).toFixed(3)),
      cost_amount: Math.round(base * (0.62 + (index % 4) * 0.08)),
      target_revenue: Math.round(base * 1.8),
      net_change: Math.round((index % 5 === 0 ? -1 : 1) * (260 + (index % 8) * 58)),
    }
  }),
  ds_payment_success: Array.from({ length: 88 }, (_, index) => {
    const cityIndex = (index + 2) % cities.length
    const dayIndex = index % dates.length
    const base = 800 + dayIndex * 36 + cityIndex * 110
    return {
      pay_date: dates[dayIndex] ?? '2026-05-01',
      order_id: `ORD202605${String(index + 1).padStart(4, '0')}`,
      user_id: `U${String(10000 + index).padStart(6, '0')}`,
      province: provinces[cityIndex] ?? '上海',
      city: cities[cityIndex] ?? '上海',
      channel: channels[index % channels.length] ?? '自然流量',
      pay_status: index % 9 === 0 ? '退款' : '支付成功',
      product_category: products[index % products.length] ?? '会员订阅',
      device_os: devices[index % devices.length] ?? 'iOS',
      user_segment: segments[index % segments.length] ?? '新用户',
      pay_amount: Math.round(base * (2.6 + (index % 3) * 0.4)),
      order_count: 80 + (index % 12) * 8,
      pay_users: 52 + (index % 10) * 5,
      refund_amount: index % 9 === 0 ? Math.round(base * 0.16) : Math.round(base * 0.03),
      coupon_amount: Math.round(base * (0.08 + (index % 4) * 0.025)),
      target_amount: Math.round(base * 3.2),
    }
  }),
  theme_data_insight_event_wide: Array.from({ length: 72 }, (_, index) => ({
    dt: dates[index % dates.length] ?? '2026-05-01',
    event_name: ['app_launch', 'ad_show', 'ad_click', 'purchase', 'share'][index % 5] ?? 'app_launch',
    scene_name: ['首页', '游戏内', '商城', '活动页'][index % 4] ?? '首页',
    app_version: ['6.4.1', '6.4.2', '6.5.0'][index % 3] ?? '6.4.1',
    country: ['中国', '美国', '日本', '韩国', '德国'][index % 5] ?? '中国',
    province: provinces[index % provinces.length] ?? '上海',
    city: cities[index % cities.length] ?? '上海',
    platform: platforms[index % platforms.length] ?? 'App',
    device_os: devices[index % devices.length] ?? 'iOS',
    channel: channels[index % channels.length] ?? '自然流量',
    experiment_group: experiments[index % experiments.length] ?? '基线组',
    retention_bucket: retentions[index % retentions.length] ?? 'D1 留存',
    event_uv: 32000 + index * 420,
    event_pv: 140000 + index * 1600,
    avg_duration: 22 + (index % 12) * 1.7,
    click_rate: Number((0.08 + (index % 9) * 0.012).toFixed(3)),
    error_count: 12 + (index % 8) * 3,
    crash_rate: Number((0.002 + (index % 6) * 0.001).toFixed(4)),
    target_uv: 38000 + index * 390,
    net_change: Math.round((index % 4 === 0 ? -1 : 1) * (320 + (index % 9) * 44)),
  })),
}

export const defaultPalettes: PaletteConfig[] = [
  {
    id: 'palette_growth',
    name: '增长分析',
    colors: ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#0891b2', '#7c3aed', '#db2777'],
    scope: 'workspace',
    createdBy: 'Chaoyang Xu',
    updatedAt: '2026-05-24 09:00:00',
  },
  {
    id: 'palette_operation',
    name: '运营监控',
    colors: ['#0f766e', '#ea580c', '#0284c7', '#65a30d', '#be123c', '#4f46e5'],
    scope: 'personal',
    createdBy: 'Chaoyang Xu',
    updatedAt: '2026-05-23 18:00:00',
  },
]

export const defaultAnnouncements: AnnouncementConfig[] = [
  {
    id: 'ann_ad_watch',
    datasetId: 'ds_ad_watch_detail',
    title: '口径提醒',
    content: '广告收益按北京时间自然日汇总，成本数据存在 2 小时延迟。',
    enabled: true,
    updatedBy: 'Chaoyang Xu',
    updatedAt: '2026-05-24 09:00:00',
  },
]
