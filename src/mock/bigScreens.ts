import {
  createDefaultThreeDLayer,
  defaultEarth3DContainerConfig,
  defaultMap3DContainerConfig,
} from '@/components/big-screen/threeDComponentRegistry'
import type {
  BigScreen,
  BigScreenAnimationConfig,
  BigScreenComponent,
  BigScreenComponentLayout,
  BigScreenDataBindingConfig,
  BigScreenGroup,
  BigScreenInteractionAction,
  BigScreenInteractionEvent,
  BigScreenPage,
  BigScreenPresentationPlan,
  BigScreenResourceAsset,
  BigScreenSnapshot,
  BigScreenTemplate,
  BigScreenThreeDLayer,
  BigScreenThreeDLayerType,
  BigScreenVariable,
  BigScreenVersion,
} from '@/types/bigScreen'

const now = '2026-05-25T16:30:00+02:00'
const projectId = 'project-dataops-demo'

const defaultAnimation: BigScreenAnimationConfig = {
  enter: {
    enabled: false,
    type: 'none',
    durationMs: 0,
    startTimeMs: 0,
    easing: 'linear',
  },
  exit: {
    enabled: false,
    type: 'none',
    durationMs: 0,
    startTimeMs: 0,
    easing: 'linear',
  },
}

const fadeInAnimation = (startTimeMs = 0): BigScreenAnimationConfig => ({
  enter: {
    enabled: true,
    type: 'fade',
    durationMs: 520,
    startTimeMs,
    easing: 'ease-out',
  },
  exit: {
    enabled: true,
    type: 'fade',
    durationMs: 320,
    startTimeMs: 0,
    easing: 'ease-in',
  },
})

const layout = (x: number, y: number, width: number, height: number): BigScreenComponentLayout => ({
  x,
  y,
  width,
  height,
  rotate: 0,
  opacity: 100,
  lockAspectRatio: false,
  overflowHidden: false,
})

const createPage = (
  screenId: string,
  id: string,
  name: string,
  sortIndex: number,
  isHomePage = false,
  color = '#08111f',
  width = 1920,
  height = 1080,
): BigScreenPage => ({
  id,
  screenId,
  name,
  width,
  height,
  background: {
    type: 'color',
    color,
    opacity: 100,
  },
  componentIds: [],
  interactionEvents: [],
  sortIndex,
  isHomePage,
})

type ComponentOptions = {
  dataBinding?: BigScreenDataBindingConfig
  interactions?: BigScreenInteractionEvent[]
  animations?: BigScreenAnimationConfig
  visible?: boolean
  locked?: boolean
  marker?: string
  parentGroupId?: string
}

const createComponent = (
  screenId: string,
  pageId: string,
  id: string,
  type: BigScreenComponent['type'],
  name: string,
  componentLayout: BigScreenComponentLayout,
  style: Record<string, unknown>,
  zIndex: number,
  options: ComponentOptions = {},
): BigScreenComponent => ({
  id,
  pageId,
  screenId,
  type,
  name,
  parentGroupId: options.parentGroupId,
  layout: componentLayout,
  style,
  dataBinding: options.dataBinding,
  interactions: options.interactions ?? [],
  animations: options.animations ?? fadeInAnimation(zIndex * 80),
  visible: options.visible ?? true,
  locked: options.locked ?? false,
  zIndex,
  marker: options.marker ?? '',
  createdAt: now,
  updatedAt: now,
})

const action = (
  id: string,
  type: BigScreenInteractionAction['type'],
  payload: Record<string, unknown> = {},
  targetId?: string,
): BigScreenInteractionAction => ({
  id,
  type,
  targetId,
  payload,
})

const interaction = (
  id: string,
  name: string,
  trigger: BigScreenInteractionEvent['trigger'],
  actions: BigScreenInteractionAction[],
): BigScreenInteractionEvent => ({
  id,
  name,
  trigger,
  enabled: true,
  conditions: [{ id: `${id}-always`, source: 'constant', operator: 'always', enabled: true }],
  actions,
})

const chartStyle = (title: string, colorScheme = ['#38bdf8', '#22c55e', '#f59e0b', '#a78bfa']): Record<string, unknown> => ({
  title,
  colorScheme,
  legendVisible: true,
  valueLabelVisible: false,
  xAxisVisible: true,
  yAxisVisible: true,
  animationEnabled: true,
  animationDurationMs: 800,
  animationEasing: 'ease-out',
  smooth: true,
  areaOpacity: 0.24,
})

const dataBinding = (
  rows: Array<Record<string, unknown>>,
  overrides: Partial<BigScreenDataBindingConfig> = {},
): BigScreenDataBindingConfig => ({
  sourceType: overrides.sourceType ?? 'static',
  fields: overrides.fields ?? [
    { slot: 'dimension', fieldName: 'category', fieldType: 'dimension' },
    { slot: 'series', fieldName: 'series', fieldType: 'dimension' },
    { slot: 'measure', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
    { slot: 'secondaryMeasure', fieldName: 'compareValue', fieldType: 'measure', aggregation: 'sum' },
    { slot: 'target', fieldName: 'target', fieldType: 'measure', aggregation: 'sum' },
    { slot: 'source', fieldName: 'source', fieldType: 'dimension' },
    { slot: 'targetNode', fieldName: 'to', fieldType: 'dimension' },
  ],
  fieldSlots: {
    dimension: ['category'],
    series: ['series'],
    measure: ['value'],
    secondaryMeasure: ['compareValue'],
    target: ['target'],
    source: ['source'],
    targetNode: ['to'],
    ...(overrides.fieldSlots ?? {}),
  },
  updateMode: 'manual',
  refreshIntervalSeconds: 60,
  sortRules: overrides.sortRules ?? [],
  filterRules: overrides.filterRules ?? [],
  topN: overrides.topN ?? { enabled: false, mode: 'all', count: 10, measureField: 'value' },
  referenceLines: overrides.referenceLines ?? [],
  extraFields: overrides.extraFields ?? [],
  globalFilterBindings: overrides.globalFilterBindings ?? [],
  lastQueryState: overrides.lastQueryState ?? {
    status: 'success',
    startedAt: '2026-05-25T16:29:12+02:00',
    finishedAt: '2026-05-25T16:29:13+02:00',
    rawDataPreview: rows.slice(0, 3),
  },
  staticRows: rows,
  sourceId: overrides.sourceId,
  sourceConfig: overrides.sourceConfig,
})

const metricRows = (value: number, compareValue: number, target: number, category = '本期') => [
  { category, series: '本期', value, compareValue, target, channel: '全部', region: '全国', date: '2026-05-25' },
]

const weeklyRows = [
  { category: '周一', series: '活跃用户', value: 12860, compareValue: 10800, target: 15000, channel: '自然增长', region: '华东', date: '2026-05-19' },
  { category: '周二', series: '活跃用户', value: 14220, compareValue: 11900, target: 15000, channel: '广告投放', region: '华东', date: '2026-05-20' },
  { category: '周三', series: '活跃用户', value: 15180, compareValue: 12600, target: 16000, channel: '自然增长', region: '华南', date: '2026-05-21' },
  { category: '周四', series: '活跃用户', value: 16840, compareValue: 13200, target: 17000, channel: '短视频', region: '华北', date: '2026-05-22' },
  { category: '周五', series: '活跃用户', value: 17620, compareValue: 14800, target: 18000, channel: '广告投放', region: '华东', date: '2026-05-23' },
  { category: '周六', series: '活跃用户', value: 18460, compareValue: 15320, target: 19000, channel: '短视频', region: '西南', date: '2026-05-24' },
  { category: '周日', series: '活跃用户', value: 19320, compareValue: 16040, target: 20000, channel: '自然增长', region: '华南', date: '2026-05-25' },
  { category: '周一', series: '广告观看', value: 28600, compareValue: 24200, target: 32000, channel: '广告投放', region: '华东', date: '2026-05-19' },
  { category: '周二', series: '广告观看', value: 31400, compareValue: 26700, target: 34000, channel: '广告投放', region: '华北', date: '2026-05-20' },
  { category: '周三', series: '广告观看', value: 35690, compareValue: 30400, target: 36000, channel: '短视频', region: '华南', date: '2026-05-21' },
  { category: '周四', series: '广告观看', value: 37220, compareValue: 32900, target: 38000, channel: '短视频', region: '西南', date: '2026-05-22' },
  { category: '周五', series: '广告观看', value: 38840, compareValue: 34400, target: 40000, channel: '广告投放', region: '华东', date: '2026-05-23' },
  { category: '周六', series: '广告观看', value: 41260, compareValue: 36120, target: 42000, channel: '自然增长', region: '华南', date: '2026-05-24' },
  { category: '周日', series: '广告观看', value: 43620, compareValue: 38200, target: 45000, channel: '广告投放', region: '华北', date: '2026-05-25' },
]

const regionRows = [
  { category: '华东', series: '本期', value: 38620, compareValue: 34200, target: 42000, channel: '广告投放', region: '华东' },
  { category: '华南', series: '本期', value: 31280, compareValue: 28700, target: 36000, channel: '短视频', region: '华南' },
  { category: '华北', series: '本期', value: 27460, compareValue: 25600, target: 30000, channel: '自然增长', region: '华北' },
  { category: '西南', series: '本期', value: 22690, compareValue: 19800, target: 26000, channel: '广告投放', region: '西南' },
  { category: '华中', series: '本期', value: 19420, compareValue: 17100, target: 23000, channel: '自然增长', region: '华中' },
  { category: '西北', series: '本期', value: 12860, compareValue: 11200, target: 17000, channel: '短视频', region: '西北' },
]

const channelRows = [
  { category: '自然增长', series: '渠道', value: 38, compareValue: 31, target: 45, channel: '自然增长' },
  { category: '广告投放', series: '渠道', value: 31, compareValue: 36, target: 35, channel: '广告投放' },
  { category: '短视频', series: '渠道', value: 21, compareValue: 18, target: 25, channel: '短视频' },
  { category: '私域触达', series: '渠道', value: 10, compareValue: 15, target: 18, channel: '私域触达' },
]

const funnelRows = [
  { category: '曝光', series: '漏斗', value: 520000, compareValue: 486000, target: 560000 },
  { category: '点击', series: '漏斗', value: 188600, compareValue: 176200, target: 210000 },
  { category: '激活', series: '漏斗', value: 92800, compareValue: 86400, target: 105000 },
  { category: '下单', series: '漏斗', value: 28600, compareValue: 25400, target: 34000 },
  { category: '复购', series: '漏斗', value: 9620, compareValue: 8200, target: 12000 },
]

const sankeyRows = [
  { source: '曝光', to: '点击', value: 188600, category: '曝光-点击', series: '转化', compareValue: 176200, target: 210000 },
  { source: '点击', to: '注册', value: 92800, category: '点击-注册', series: '转化', compareValue: 86400, target: 105000 },
  { source: '注册', to: '首购', value: 28600, category: '注册-首购', series: '转化', compareValue: 25400, target: 34000 },
  { source: '首购', to: '复购', value: 9620, category: '首购-复购', series: '转化', compareValue: 8200, target: 12000 },
  { source: '注册', to: '沉默', value: 18400, category: '注册-沉默', series: '流失', compareValue: 20200, target: 15000 },
]

const qualityRows = [
  { category: '性能', series: '质量', value: 86, compareValue: 79, target: 100 },
  { category: '稳定性', series: '质量', value: 92, compareValue: 88, target: 100 },
  { category: '体验', series: '质量', value: 78, compareValue: 72, target: 100 },
  { category: '安全', series: '质量', value: 88, compareValue: 82, target: 100 },
  { category: '转化', series: '质量', value: 74, compareValue: 68, target: 100 },
]

const scatterRows = [
  { category: '华东', series: '渠道质量', value: 82, compareValue: 71, target: 16800 },
  { category: '华南', series: '渠道质量', value: 76, compareValue: 64, target: 14200 },
  { category: '华北', series: '渠道质量', value: 69, compareValue: 58, target: 11600 },
  { category: '西南', series: '渠道质量', value: 62, compareValue: 51, target: 9600 },
  { category: '华中', series: '渠道质量', value: 71, compareValue: 55, target: 8400 },
]

const wordRows = [
  { category: '增长', series: '热点', value: 860, compareValue: 720, target: 1000 },
  { category: '留存', series: '热点', value: 760, compareValue: 680, target: 900 },
  { category: '广告观看', series: '热点', value: 920, compareValue: 840, target: 1000 },
  { category: '复购', series: '热点', value: 540, compareValue: 480, target: 700 },
  { category: '转化率', series: '热点', value: 680, compareValue: 610, target: 800 },
  { category: '风险用户', series: '热点', value: 420, compareValue: 460, target: 500 },
  { category: '区域下钻', series: '热点', value: 620, compareValue: 580, target: 760 },
]

const geoRows = [
  { name: '北京', label: '北京', lng: 116.4, lat: 39.9, value: 12680, targetLng: 121.5, targetLat: 31.2, category: '北京', series: '城市', compareValue: 10800, target: 15000 },
  { name: '上海', label: '上海', lng: 121.5, lat: 31.2, value: 18920, targetLng: 113.2, targetLat: 23.1, category: '上海', series: '城市', compareValue: 16200, target: 22000 },
  { name: '广州', label: '广州', lng: 113.2, lat: 23.1, value: 14260, targetLng: 104.1, targetLat: 30.7, category: '广州', series: '城市', compareValue: 12000, target: 18000 },
  { name: '成都', label: '成都', lng: 104.1, lat: 30.7, value: 9860, targetLng: 116.4, targetLat: 39.9, category: '成都', series: '城市', compareValue: 8300, target: 13000 },
  { name: '西安', label: '西安', lng: 108.9, lat: 34.3, value: 7620, targetLng: 121.5, targetLat: 31.2, category: '西安', series: '城市', compareValue: 6900, target: 10000 },
]

const repeaterRows = [
  { title: '高价值人群', value: '18,624', status: '完成率 92%' },
  { title: '新客召回', value: '7,942', status: '提升 8.6%' },
  { title: '风险预警', value: '326', status: '已处理 281' },
  { title: '渠道校验', value: '14', status: '2 个需复查' },
  { title: '投放实验', value: '6', status: '3 个胜出' },
  { title: '任务订阅', value: '19', status: '准时率 99%' },
]

const createGroup = (screenId: string, pageId: string, id: string, name: string, componentIds: string[], zIndex: number): BigScreenGroup => ({
  id,
  screenId,
  pageId,
  name,
  componentIds,
  visible: true,
  locked: false,
  zIndex,
})

const createVariables = (screenId: string): BigScreenVariable[] => [
  {
    id: `${screenId}-var-date`,
    name: '当前日期',
    key: 'currentDate',
    type: 'date',
    value: '2026-05-25',
    description: '用于发布页展示日期与交互条件。',
  },
  {
    id: `${screenId}-var-region`,
    name: '当前区域',
    key: 'currentRegion',
    type: 'string',
    value: '全国',
    description: '区域下钻、筛选控件和图表联动共享的变量。',
  },
]

const syncPageComponentIds = (pages: BigScreenPage[], components: BigScreenComponent[]): BigScreenPage[] =>
  pages.map((page) => ({
    ...page,
    componentIds: components.filter((component) => component.pageId === page.id).sort((left, right) => left.zIndex - right.zIndex).map((component) => component.id),
  }))

const buildSnapshot = (
  screenId: string,
  name: string,
  pages: BigScreenPage[],
  components: BigScreenComponent[],
  groups: BigScreenGroup[] = [],
  options: Partial<Pick<BigScreenSnapshot, 'deviceMode' | 'ratioType' | 'layoutPreset'>> = {},
): BigScreenSnapshot => {
  const normalizedPages = syncPageComponentIds(pages, components)

  return {
    screenId,
    name,
    deviceMode: options.deviceMode ?? 'pc',
    ratioType: options.ratioType ?? '16:9',
    layoutPreset: options.layoutPreset ?? 'dense-center',
    homePageId: normalizedPages.find((page) => page.isHomePage)?.id ?? normalizedPages[0]?.id ?? `${screenId}-page-home`,
    pages: normalizedPages,
    components,
    groups,
    globalVariables: createVariables(screenId),
    assets: [
      {
        id: `${screenId}-asset-cover`,
        name: '演示封面',
        type: 'image',
        url: 'https://dummyimage.com/1280x720/082f49/38bdf8&text=BigScreen',
        size: 512 * 1024,
        createdAt: now,
      },
    ],
    capturedAt: now,
  }
}

const createGeoLayer = (
  parentComponentId: string,
  type: BigScreenThreeDLayerType,
  index: number,
  color: string,
): BigScreenThreeDLayer => {
  const layer = createDefaultThreeDLayer(parentComponentId, type, index)

  return {
    ...layer,
    id: `${parentComponentId}-layer-${type}`,
    parentComponentId,
    zIndex: index + 1,
    dataBinding: {
      ...dataBinding(geoRows),
      fields: [
        { slot: 'name', fieldName: 'name', fieldType: 'dimension' },
        { slot: 'lng', fieldName: 'lng', fieldType: 'measure' },
        { slot: 'lat', fieldName: 'lat', fieldType: 'measure' },
        { slot: 'value', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
        { slot: 'targetLng', fieldName: 'targetLng', fieldType: 'measure' },
        { slot: 'targetLat', fieldName: 'targetLat', fieldType: 'measure' },
      ],
      fieldSlots: {
        name: ['name'],
        lng: ['lng'],
        lat: ['lat'],
        value: ['value'],
        targetLng: ['targetLng'],
        targetLat: ['targetLat'],
      },
      updateMode: 'auto',
      refreshIntervalSeconds: 45,
    },
    styleConfig: {
      ...layer.styleConfig,
      color,
      size: type === 'bubble' ? 18 : 12,
      heightScale: type === 'bar3d' ? 1.25 : 1,
      opacity: type.includes('Heat') ? 0.52 : 0.86,
      labelVisible: type === 'infoLabel',
      animationEnabled: true,
    },
    animationConfig: {
      enabled: true,
      speed: 1 + index * 0.08,
      loop: true,
    },
    interactions: [
      interaction(`${parentComponentId}-${type}-click`, '点击图元写入当前区域变量', 'click', [
        action(`${parentComponentId}-${type}-var`, 'set-variable', { key: 'currentRegion', valueSource: 'event', eventKey: 'name' }),
      ]),
    ],
  }
}

const buildOperationScreen = (): BigScreen => {
  const screenId = 'screen-operation-command'
  const overviewPage = createPage(screenId, 'page-operation-overview', '经营总览', 0, true, '#07101d')
  const regionPage = createPage(screenId, 'page-operation-region', '区域态势', 1, false, '#081525')
  const detailPage = createPage(screenId, 'page-operation-detail', '指标明细', 2, false, '#0b1220')
  const kpiGroupId = 'group-operation-kpis'
  const components: BigScreenComponent[] = []

  components.push(
    createComponent(screenId, overviewPage.id, 'cmp-operation-bg', 'rectangle', '全屏底色框', layout(36, 28, 1848, 1012), {
      backgroundColor: 'rgba(3, 12, 24, 0.34)',
      borderColor: 'rgba(56, 189, 248, 0.28)',
      borderWidth: 1,
      borderRadius: 8,
      shadow: 'inset 0 0 80px rgba(56, 189, 248, 0.08)',
    }, 0, { locked: true }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-title', 'title', '大屏标题', layout(72, 42, 760, 80), {
      text: 'DataOps 经营指挥中心',
      fontSize: 46,
      fontWeight: 700,
      color: '#f8fafc',
      letterSpacing: 0,
      textAlign: 'left',
    }, 1),
    createComponent(screenId, overviewPage.id, 'cmp-operation-subtitle', 'singleText', '联动提示文本', layout(74, 120, 760, 42), {
      text: '实时监控用户增长、广告观看、留存与运营风险',
      fontSize: 18,
      color: '#8fb7d9',
      textAlign: 'left',
    }, 2),
    createComponent(screenId, overviewPage.id, 'cmp-operation-time', 'datetime', '当前时间', layout(1420, 48, 360, 42), {
      format: 'YYYY-MM-DD HH:mm:ss',
      fontSize: 24,
      color: '#dbeafe',
      textAlign: 'right',
    }, 3),
    createComponent(screenId, overviewPage.id, 'cmp-operation-weekday', 'weekday', '星期', layout(1780, 52, 80, 36), {
      fontSize: 20,
      color: '#7dd3fc',
      textAlign: 'right',
    }, 4),
    createComponent(screenId, overviewPage.id, 'cmp-operation-date-filter', 'select', '渠道筛选', layout(72, 176, 230, 92), {
      placeholder: '渠道筛选',
      value: '广告投放',
      options: [
        { label: '全部', value: '' },
        { label: '自然增长', value: '自然增长' },
        { label: '广告投放', value: '广告投放' },
        { label: '短视频', value: '短视频' },
      ],
      backgroundColor: 'rgba(15, 23, 42, 0.82)',
      borderColor: '#38bdf8',
    }, 5, {
      interactions: [
        interaction('it-operation-channel-filter', '切换渠道后筛选趋势图', 'change', [
          action('act-operation-channel-filter', 'set-filter', {
            fieldName: 'channel',
            operator: 'eq',
            valueSource: 'event',
            eventKey: 'value',
          }, 'cmp-operation-trend'),
          action('act-operation-region-filter', 'set-filter', {
            fieldName: 'channel',
            operator: 'eq',
            valueSource: 'event',
            eventKey: 'value',
          }, 'cmp-operation-ranking'),
        ]),
      ],
    }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-kpi-users', 'metricCard', '活跃用户指标卡', layout(72, 296, 306, 146), {
      mainLabel: '活跃用户',
      suffix: '人',
      trendLabel: '较昨日 +12.6%',
      color: '#38bdf8',
    }, 6, {
      parentGroupId: kpiGroupId,
      dataBinding: dataBinding(metricRows(128640, 114220, 150000)),
      interactions: [
        interaction('it-operation-kpi-hover', '悬停展示指标口径', 'mouseenter', [
          action('act-operation-kpi-hover-wait', 'wait', { durationMs: 120 }),
          action('act-operation-kpi-hover-text', 'set-element-property', {
            propertyName: 'text',
            value: '活跃用户 = 当日打开应用并产生有效行为的去重用户数',
          }, 'cmp-operation-subtitle'),
        ]),
        interaction('it-operation-kpi-leave', '移出恢复说明', 'mouseleave', [
          action('act-operation-kpi-leave-text', 'set-element-property', {
            propertyName: 'text',
            value: '实时监控用户增长、广告观看、留存与运营风险',
          }, 'cmp-operation-subtitle'),
        ]),
      ],
    }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-kpi-ads', 'metricCard', '广告观看指标卡', layout(398, 296, 306, 146), {
      mainLabel: '广告观看次数',
      suffix: '次',
      trendLabel: '较昨日 +8.4%',
      color: '#22c55e',
    }, 7, { parentGroupId: kpiGroupId, dataBinding: dataBinding(metricRows(356920, 328400, 390000)) }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-kpi-retention', 'singleValueDonut', '次日留存环图', layout(724, 296, 306, 146), {
      title: '次日留存',
      centerLabel: 'D1 留存',
      suffix: '%',
      max: 100,
      colorScheme: ['#f59e0b', '#334155'],
    }, 8, { parentGroupId: kpiGroupId, dataBinding: dataBinding(metricRows(68, 61, 82)) }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-flip', 'flipNumber', 'GMV 翻牌器', layout(1050, 296, 330, 146), {
      prefix: '¥',
      suffix: '',
      colorScheme: ['#a78bfa'],
    }, 9, { parentGroupId: kpiGroupId, dataBinding: dataBinding(metricRows(9286400, 8120000, 10000000)) }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-trend', 'line', '趋势联动折线图', layout(72, 468, 704, 300), {
      ...chartStyle('活跃与广告观看趋势', ['#38bdf8', '#22c55e', '#f59e0b']),
      valueLabelVisible: true,
    }, 10, {
      dataBinding: dataBinding(weeklyRows, {
        updateMode: 'auto',
        refreshIntervalSeconds: 30,
        referenceLines: [{ id: 'ref-trend-avg', name: '平均线', fieldName: 'value', value: 'avg', color: '#f59e0b', visible: true }],
        extraFields: [{ id: 'extra-rate', name: '完成率', expression: 'value / target * 100', dataType: 'number', enabled: true }],
      }),
      interactions: [
        interaction('it-operation-chart-filter', '点击趋势筛选地区排行', 'click', [
          action('act-operation-chart-filter', 'set-filter', {
            fieldName: 'category',
            operator: 'eq',
            valueSource: 'event',
            eventKey: 'name',
          }, 'cmp-operation-table'),
        ]),
      ],
    }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-channel-pie', 'donut', '渠道结构环图', layout(812, 468, 392, 300), {
      ...chartStyle('渠道贡献结构', ['#38bdf8', '#22c55e', '#f59e0b', '#ef4444']),
      valueLabelVisible: true,
    }, 11, {
      dataBinding: dataBinding(channelRows),
      interactions: [
        interaction('it-operation-pie-filter', '点击渠道筛选排行', 'click', [
          action('act-operation-pie-filter-ranking', 'set-filter', {
            fieldName: 'channel',
            operator: 'eq',
            valueSource: 'event',
            eventKey: 'name',
          }, 'cmp-operation-ranking'),
        ]),
      ],
    }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-ranking', 'rankingList', '区域排行榜', layout(1240, 468, 600, 300), {
      title: '区域贡献排行',
      colorScheme: ['#38bdf8', '#22c55e'],
    }, 12, {
      dataBinding: dataBinding(regionRows, {
        sortRules: [{ fieldName: 'value', order: 'desc' }],
        topN: { enabled: true, mode: 'top', count: 6, measureField: 'value' },
      }),
    }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-table', 'table', '明细表格', layout(72, 800, 704, 216), {
      title: '点击趋势后查看明细',
      rowNumberVisible: true,
      stripe: true,
      scrollRows: 5,
      colorScheme: ['#38bdf8'],
    }, 13, { dataBinding: dataBinding(weeklyRows) }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-carousel', 'carousel', '风险轮播器', layout(812, 800, 392, 216), {
      panels: [
        { id: 'risk-1', name: '预算风险', title: '华东预算消耗过快', description: '预计 20:30 前触达预算上限' },
        { id: 'risk-2', name: '渠道异常', title: '短视频转化率低于阈值', description: '建议检查落地页加载与素材疲劳' },
        { id: 'risk-3', name: '留存波动', title: '西南 D1 留存下滑', description: '新用户任务完成率连续 2 天下降' },
      ],
      activePanelId: 'risk-1',
      autoplay: true,
      intervalSeconds: 4,
      indicatorVisible: true,
    }, 14, {
      interactions: [
        interaction('it-operation-carousel-next', '点击切换下一条风险', 'click', [
          action('act-operation-carousel-next', 'change-carousel-state', { mode: 'next' }, 'cmp-operation-carousel'),
        ]),
      ],
    }),
    createComponent(screenId, overviewPage.id, 'cmp-operation-tabs', 'tabs', '行动标签页', layout(1240, 800, 360, 216), {
      panels: [
        { id: 'tab-growth', name: '增长', title: '加码华南自然增长投放' },
        { id: 'tab-retention', name: '留存', title: '针对低完成率任务做激励补偿' },
        { id: 'tab-risk', name: '风险', title: '关注预算与异常渠道双阈值告警' },
      ],
      activeTabId: 'tab-growth',
      headerVisible: true,
      autoPlay: false,
    }, 15),
    createComponent(screenId, overviewPage.id, 'cmp-operation-to-region', 'hotspot', '进入区域页热区', layout(1620, 820, 220, 78), {
      actionLabel: '进入区域态势',
      backgroundColor: 'rgba(37, 99, 235, 0.88)',
      borderColor: '#93c5fd',
      color: '#ffffff',
    }, 16, {
      interactions: [
        interaction('it-operation-switch-region', '切换到区域态势页', 'click', [
          action('act-operation-switch-region', 'switch-page', { pageId: regionPage.id }, regionPage.id),
        ]),
      ],
    }),
  )

  const mapComponentId = 'cmp-region-map3d'
  const allMapLayerTypes: BigScreenThreeDLayerType[] = [
    'adminHeat',
    'classicHeat',
    'hexHeat',
    'gridHeat',
    'isochrone',
    'bubble',
    'iconScatter',
    'bar3d',
    'infoLabel',
    'flyLine',
    'trajectoryLine',
    'surfaceDecoration',
    'risingChar',
    'particle',
  ]
  const layerColors = ['#2563eb', '#38bdf8', '#22c55e', '#f59e0b', '#a78bfa', '#06b6d4', '#ef4444']
  const mapLayers = allMapLayerTypes.map((type, index) => createGeoLayer(mapComponentId, type, index, layerColors[index % layerColors.length]!))

  components.push(
    createComponent(screenId, regionPage.id, 'cmp-region-title', 'title', '区域页标题', layout(72, 42, 680, 74), {
      text: '区域运营态势',
      fontSize: 42,
      fontWeight: 700,
      color: '#f8fafc',
      textAlign: 'left',
    }, 1),
    createComponent(screenId, regionPage.id, 'cmp-region-back', 'hotspot', '返回经营总览', layout(1640, 48, 220, 64), {
      actionLabel: '返回经营总览',
      backgroundColor: 'rgba(15, 23, 42, 0.74)',
      borderColor: '#38bdf8',
      color: '#dbeafe',
    }, 2, {
      interactions: [
        interaction('it-region-back', '返回首页', 'click', [
          action('act-region-back', 'switch-page', { pageId: overviewPage.id }, overviewPage.id),
        ]),
      ],
    }),
    createComponent(screenId, regionPage.id, 'cmp-region-tree', 'treeSelect', '区域树选择', layout(72, 140, 260, 96), {
      placeholder: '区域树选择',
      value: '华东',
      treeData: [
        { label: '全国', value: '全国', children: [
          { label: '华东', value: '华东' },
          { label: '华南', value: '华南' },
          { label: '西南', value: '西南' },
        ] },
      ],
      backgroundColor: 'rgba(15, 23, 42, 0.82)',
      borderColor: '#38bdf8',
    }, 3, {
      interactions: [
        interaction('it-region-tree-change', '区域选择联动趋势', 'change', [
          action('act-region-tree-filter', 'set-filter', {
            fieldName: 'region',
            operator: 'eq',
            valueSource: 'event',
            eventKey: 'value',
          }, 'cmp-region-trend'),
          action('act-region-tree-var', 'set-variable', { key: 'currentRegion', valueSource: 'event', eventKey: 'value' }),
        ]),
      ],
    }),
    createComponent(screenId, regionPage.id, 'cmp-region-datepicker', 'datePicker', '日期选择器', layout(360, 140, 220, 96), {
      placeholder: '日期',
      value: '2026-05-25',
      minDate: '2026-05-01',
      maxDate: '2026-05-31',
      backgroundColor: 'rgba(15, 23, 42, 0.82)',
      borderColor: '#38bdf8',
    }, 4, {
      interactions: [
        interaction('it-region-date-change', '日期写入全局变量', 'change', [
          action('act-region-date-var', 'set-variable', { key: 'currentDate', valueSource: 'event', eventKey: 'value' }),
          action('act-region-date-refresh', 'refresh-all-visuals', {}),
        ]),
      ],
    }),
    createComponent(screenId, regionPage.id, mapComponentId, 'map3d', '3D 地图全图层示例', layout(72, 260, 1120, 760), {
      containerConfig: {
        ...defaultMap3DContainerConfig,
        adminMap: {
          ...defaultMap3DContainerConfig.adminMap,
          extrusionHeight: 1.35,
          fillStyle: { color: '#123e7a', opacity: 0.76, metalness: 0.32, roughness: 0.48 },
        },
        camera: { center: [104, 35], zoom: 4.3, pitch: 48, bearing: 0 },
      },
      layers: mapLayers,
      diagnostics: {
        webgl2: 'ok',
        hardwareAcceleration: 'available',
        blackScreenHint: '',
      },
    }, 5, {
      interactions: [
        interaction('it-region-map-drill', '点击地图下钻华东', 'click', [
          action('act-region-map-drill', 'gis-drill', { region: '华东' }, mapComponentId),
        ]),
      ],
    }),
    createComponent(screenId, regionPage.id, 'cmp-region-trend', 'area', '区域趋势面积图', layout(1230, 260, 610, 330), {
      ...chartStyle('区域趋势与筛选联动', ['#38bdf8', '#22c55e']),
      areaOpacity: 0.36,
    }, 6, { dataBinding: dataBinding(weeklyRows, { updateMode: 'auto', refreshIntervalSeconds: 45 }) }),
    createComponent(screenId, regionPage.id, 'cmp-region-bars', 'groupedBar', '区域横向柱图', layout(1230, 620, 610, 400), {
      ...chartStyle('城市贡献对比', ['#38bdf8', '#f59e0b']),
      valueLabelVisible: true,
    }, 7, { dataBinding: dataBinding(regionRows) }),
  )

  components.push(
    createComponent(screenId, detailPage.id, 'cmp-detail-title', 'title', '明细页标题', layout(72, 46, 720, 74), {
      text: '指标明细与任务清单',
      fontSize: 40,
      fontWeight: 700,
      color: '#f8fafc',
    }, 1),
    createComponent(screenId, detailPage.id, 'cmp-detail-back', 'hotspot', '返回总览', layout(1640, 52, 220, 64), {
      actionLabel: '返回总览',
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      borderColor: '#38bdf8',
    }, 2, {
      interactions: [
        interaction('it-detail-back', '返回总览页', 'click', [
          action('act-detail-back', 'switch-page', { pageId: overviewPage.id }, overviewPage.id),
        ]),
      ],
    }),
    createComponent(screenId, detailPage.id, 'cmp-detail-repeater', 'repeater', '运营任务重复器', layout(72, 160, 780, 420), {
      itemsPerLine: 3,
      pageSize: 6,
      sampleRows: repeaterRows,
      itemBorderColor: '#38bdf8',
      itemBackground: 'rgba(15, 47, 81, 0.72)',
    }, 3),
    createComponent(screenId, detailPage.id, 'cmp-detail-funnel', 'funnel', '转化漏斗', layout(920, 160, 420, 420), {
      ...chartStyle('转化漏斗', ['#38bdf8', '#22c55e', '#f59e0b']),
      valueLabelVisible: true,
    }, 4, { dataBinding: dataBinding(funnelRows) }),
    createComponent(screenId, detailPage.id, 'cmp-detail-sankey', 'sankey', '路径桑基图', layout(1390, 160, 450, 420), {
      ...chartStyle('关键路径流转', ['#38bdf8', '#22c55e', '#f59e0b', '#ef4444']),
      valueLabelVisible: true,
    }, 5, {
      dataBinding: dataBinding(sankeyRows, {
        fieldSlots: { source: ['source'], target: ['to'], value: ['value'] },
      }),
    }),
    createComponent(screenId, detailPage.id, 'cmp-detail-word', 'wordCloud', '热点词云', layout(72, 640, 420, 320), {
      title: '热点指标',
      colorScheme: ['#38bdf8', '#22c55e', '#f59e0b', '#a78bfa'],
    }, 6, { dataBinding: dataBinding(wordRows) }),
    createComponent(screenId, detailPage.id, 'cmp-detail-circle', 'circleView', '气泡关系图', layout(530, 640, 420, 320), {
      title: '重点人群圈选',
      colorScheme: ['#38bdf8', '#22c55e', '#f59e0b', '#a78bfa'],
    }, 7, { dataBinding: dataBinding(regionRows) }),
    createComponent(screenId, detailPage.id, 'cmp-detail-open-docs', 'hotspot', '打开文档热区', layout(1440, 690, 260, 78), {
      actionLabel: '打开大屏说明',
      backgroundColor: 'rgba(37, 99, 235, 0.88)',
      borderColor: '#93c5fd',
    }, 8, {
      interactions: [
        interaction('it-detail-open-docs', '打开文档链接', 'click', [
          action('act-detail-open-docs', 'open-link', { url: 'https://example.com/big-screen-guide', target: '_blank' }),
        ]),
      ],
    }),
  )

  components.find((component) => component.id === 'cmp-operation-table')!.interactions = [
    interaction('it-table-dbl-detail', '双击明细进入详情页', 'double-click', [
      action('act-table-switch-detail', 'switch-page', { pageId: detailPage.id }, detailPage.id),
    ]),
  ]

  const groups = [
    createGroup(screenId, overviewPage.id, kpiGroupId, '核心指标组', [
      'cmp-operation-kpi-users',
      'cmp-operation-kpi-ads',
      'cmp-operation-kpi-retention',
      'cmp-operation-flip',
    ], 10),
  ]
  const draftSnapshot = buildSnapshot(screenId, '经营指挥中心大屏', [overviewPage, regionPage, detailPage], components, groups)
  const publishedSnapshot = { ...draftSnapshot, capturedAt: '2026-05-25T15:20:00+02:00' }

  return {
    id: screenId,
    name: '经营指挥中心大屏',
    description: '面向管理层会议和办公室电视轮播，覆盖页面切换、图表联动、控件筛选、变量、版本与发布。',
    status: 'published',
    deviceMode: 'pc',
    homePageId: draftSnapshot.homePageId,
    pages: draftSnapshot.pages,
    components: draftSnapshot.components,
    groups,
    globalVariables: draftSnapshot.globalVariables,
    assets: draftSnapshot.assets,
    draftSnapshot,
    publishedSnapshot,
    publishConfig: {
      accessMode: 'public',
      accessKey: 'access-operation-command',
      viewUrl: '/big-screens/published/screen-operation-command?accessKey=access-operation-command',
      publishedVersionId: 'version-operation-v2',
      publishStatus: 'published',
    },
    versionCount: 2,
    latestVersionId: 'version-operation-v2',
    currentPublishedVersionId: 'version-operation-v2',
    createdBy: 'Chaoyang Xu',
    updatedBy: 'Chaoyang Xu',
    createdAt: '2026-05-23T10:00:00+02:00',
    updatedAt: now,
    publishedAt: '2026-05-25T15:20:00+02:00',
  }
}

const buildRetentionScreen = (): BigScreen => {
  const screenId = 'screen-retention-review'
  const page = createPage(screenId, 'page-retention-home', '留存复盘', 0, true, '#101827')
  const dataPage = createPage(screenId, 'page-retention-data', '数据源演示', 1, false, '#0f172a')
  const components: BigScreenComponent[] = [
    createComponent(screenId, page.id, 'cmp-retention-title', 'title', '标题', layout(72, 52, 680, 76), {
      text: '新用户留存复盘',
      fontSize: 44,
      fontWeight: 700,
      color: '#f8fafc',
      textAlign: 'left',
    }, 1),
    createComponent(screenId, page.id, 'cmp-retention-note', 'multiText', '说明文本', layout(74, 142, 650, 120), {
      text: '草稿大屏用于演示保存、预览、版本、发布设置，以及数据引擎的字段胶囊、筛选、排序、TopN、参考线和错误状态。',
      fontSize: 20,
      lineHeight: 1.7,
      color: '#cbd5e1',
      textAlign: 'left',
    }, 2),
    createComponent(screenId, page.id, 'cmp-retention-gauge', 'gauge', '留存健康度仪表盘', layout(74, 310, 400, 300), {
      title: '留存健康度',
      min: 0,
      max: 100,
      unit: '分',
      colorScheme: ['#22c55e'],
    }, 3, { dataBinding: dataBinding(metricRows(82, 75, 100)) }),
    createComponent(screenId, page.id, 'cmp-retention-radar', 'radar', '渠道质量雷达图', layout(520, 310, 440, 300), {
      ...chartStyle('渠道质量雷达', ['#38bdf8']),
    }, 4, { dataBinding: dataBinding(qualityRows) }),
    createComponent(screenId, page.id, 'cmp-retention-area', 'percentArea', '留存百分比面积图', layout(1000, 310, 780, 300), {
      ...chartStyle('D1/D7 留存占比趋势', ['#38bdf8', '#22c55e']),
      areaOpacity: 0.3,
    }, 5, { dataBinding: dataBinding(weeklyRows) }),
    createComponent(screenId, page.id, 'cmp-retention-scatter', 'scatter', '渠道质量散点图', layout(74, 660, 560, 320), {
      ...chartStyle('质量与规模散点', ['#f59e0b']),
    }, 6, { dataBinding: dataBinding(scatterRows) }),
    createComponent(screenId, page.id, 'cmp-retention-table', 'table', '留存明细表', layout(680, 660, 760, 320), {
      title: '留存明细',
      rowNumberVisible: true,
      scrollRows: 6,
      colorScheme: ['#38bdf8'],
    }, 7, {
      dataBinding: dataBinding(weeklyRows, {
        sortRules: [{ fieldName: 'date', order: 'desc' }],
        topN: { enabled: true, mode: 'top', count: 8, measureField: 'value' },
        referenceLines: [{ id: 'ref-retention-max', name: '峰值', fieldName: 'value', value: 'max', color: '#22c55e', visible: true }],
      }),
    }),
    createComponent(screenId, page.id, 'cmp-retention-to-data', 'hotspot', '进入数据源演示', layout(1500, 780, 260, 72), {
      actionLabel: '查看数据源演示',
      backgroundColor: 'rgba(37, 99, 235, 0.88)',
      borderColor: '#93c5fd',
    }, 8, {
      interactions: [
        interaction('it-retention-data-page', '进入数据源页', 'click', [
          action('act-retention-data-page', 'switch-page', { pageId: dataPage.id }, dataPage.id),
        ]),
      ],
    }),
    createComponent(screenId, dataPage.id, 'cmp-data-title', 'title', '数据源页标题', layout(72, 52, 760, 76), {
      text: '统一数据引擎演示',
      fontSize: 42,
      fontWeight: 700,
      color: '#f8fafc',
    }, 1),
  ]

  const sourceCards: Array<{ id: string, type: BigScreenDataBindingConfig['sourceType'], name: string, x: number, y: number, status?: 'success' | 'error' }> = [
    { id: 'dataset', type: 'dataset', name: 'Dataset 数据集', x: 72, y: 170 },
    { id: 'api', type: 'api', name: 'API 数据源', x: 470, y: 170 },
    { id: 'javascript', type: 'javascript', name: 'JavaScript 数据源', x: 868, y: 170 },
    { id: 'mysql', type: 'mysql', name: 'MySQL 数据源', x: 1266, y: 170 },
    { id: 'feishu-sheet', type: 'feishu-sheet', name: '飞书表格', x: 72, y: 540 },
    { id: 'feishu-bitable', type: 'feishu-bitable', name: '飞书多维表', x: 470, y: 540 },
    { id: 'api-error', type: 'api', name: '错误状态示例', x: 868, y: 540, status: 'error' },
  ]

  sourceCards.forEach((card, index) => {
    components.push(createComponent(screenId, dataPage.id, `cmp-data-${card.id}`, index % 2 === 0 ? 'groupedColumn' : 'line', card.name, layout(card.x, card.y, 340, 280), {
      ...chartStyle(card.name, ['#38bdf8', '#22c55e']),
      valueLabelVisible: true,
    }, index + 2, {
      dataBinding: dataBinding(weeklyRows, {
        sourceType: card.type,
        sourceId: card.type === 'api' ? '/api/mock/big-screen/retention' : `mock_${card.id}_source`,
        sourceConfig: {
          requestMethod: 'GET',
          timeoutMs: 8000,
          responsePath: 'data.rows',
          script: 'return rows.map(row => ({ ...row, value: row.value * 1.08 }))',
          sql: 'select date, channel, value from retention_daily where dt = ${currentDate}',
          spreadsheetUrl: 'https://feishu.example/sheets/mock',
          bitableAppToken: 'app_token_masked',
        },
        updateMode: card.status === 'error' ? 'manual' : 'auto',
        refreshIntervalSeconds: 60 + index * 15,
        lastQueryState: card.status === 'error'
          ? { status: 'error', startedAt: now, finishedAt: now, errorMessage: '模拟接口返回字段缺失，无法映射到 value。', rawDataPreview: { code: 500, message: 'mock error' } }
          : undefined,
      }),
    }))
  })

  components.push(createComponent(screenId, dataPage.id, 'cmp-data-back', 'hotspot', '返回留存复盘', layout(1500, 820, 240, 72), {
    actionLabel: '返回复盘页',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: '#38bdf8',
  }, 12, {
    interactions: [
      interaction('it-data-back', '返回留存页', 'click', [
        action('act-data-back', 'switch-page', { pageId: page.id }, page.id),
      ]),
    ],
  }))

  const draftSnapshot = buildSnapshot(screenId, '新用户留存复盘大屏', [page, dataPage], components, [], { layoutPreset: 'sparse-left-right' })

  return {
    id: screenId,
    name: '新用户留存复盘大屏',
    description: '用于周会复盘新用户渠道质量、留存波动和任务转化情况，重点演示草稿、数据源与查询异常。',
    status: 'draft',
    deviceMode: 'pc',
    homePageId: draftSnapshot.homePageId,
    pages: draftSnapshot.pages,
    components: draftSnapshot.components,
    groups: [],
    globalVariables: draftSnapshot.globalVariables,
    assets: draftSnapshot.assets,
    draftSnapshot,
    versionCount: 1,
    latestVersionId: 'version-retention-v1',
    createdBy: 'Mia Chen',
    updatedBy: 'Chaoyang Xu',
    createdAt: '2026-05-24T18:40:00+02:00',
    updatedAt: '2026-05-25T11:30:00+02:00',
  }
}

const buildComponentLabScreen = (): BigScreen => {
  const screenId = 'screen-component-lab'
  const basicPage = createPage(screenId, 'page-lab-defaults', '默认组件与控件', 0, true, '#0b1220')
  const chartPage = createPage(screenId, 'page-lab-charts', '图表组件库', 1, false, '#08111f')
  const earthPage = createPage(screenId, 'page-lab-earth', '3D 地球', 2, false, '#020617')
  const components: BigScreenComponent[] = [
    createComponent(screenId, basicPage.id, 'cmp-lab-title', 'title', '组件实验室标题', layout(72, 42, 720, 78), {
      text: '数字大屏组件能力实验室',
      fontSize: 42,
      fontWeight: 700,
      color: '#f8fafc',
    }, 1),
    createComponent(screenId, basicPage.id, 'cmp-lab-single', 'singleText', '单行文本', layout(74, 128, 620, 42), {
      text: '默认组件、媒体、容器、控件和交互操作集中演示。',
      fontSize: 18,
      color: '#93c5fd',
    }, 2),
    createComponent(screenId, basicPage.id, 'cmp-lab-multi', 'multiText', '多行文本', layout(72, 196, 420, 120), {
      text: '这里可以检查文本换行、字体、颜色、行高、透明度和锁定隐藏等编辑器能力。',
      fontSize: 18,
      lineHeight: 1.6,
      color: '#cbd5e1',
    }, 3),
    createComponent(screenId, basicPage.id, 'cmp-lab-rect', 'rectangle', '矩形背景', layout(530, 184, 280, 132), {
      backgroundColor: 'rgba(15, 47, 81, 0.74)',
      borderColor: '#38bdf8',
      borderWidth: 1,
      borderRadius: 8,
    }, 4),
    createComponent(screenId, basicPage.id, 'cmp-lab-circle', 'circle', '圆形装饰', layout(846, 188, 122, 122), {
      backgroundColor: 'rgba(34, 197, 94, 0.20)',
      borderColor: '#22c55e',
      borderWidth: 2,
    }, 5),
    createComponent(screenId, basicPage.id, 'cmp-lab-image', 'image', '图片组件', layout(1000, 180, 260, 160), {
      imageUrl: 'https://dummyimage.com/520x320/0f172a/38bdf8&text=Image',
      objectFit: 'cover',
    }, 6),
    createComponent(screenId, basicPage.id, 'cmp-lab-video', 'video', '普通视频', layout(1290, 180, 260, 160), {
      videoUrl: '',
      posterUrl: 'https://dummyimage.com/520x320/111827/93c5fd&text=Video',
      controls: true,
      autoplay: false,
      loop: true,
      muted: true,
    }, 7),
    createComponent(screenId, basicPage.id, 'cmp-lab-stream', 'videoStream', '视频流', layout(1580, 180, 260, 160), {
      streamType: 'hls',
      streamUrl: 'https://example.com/live/operation.m3u8',
      reconnectEnabled: true,
      hiddenUnmount: true,
      errorText: '视频流暂未连通',
      backgroundColor: 'rgba(15, 23, 42, 0.84)',
      borderColor: '#38bdf8',
    }, 8),
    createComponent(screenId, basicPage.id, 'cmp-lab-iframe', 'iframe', '网页组件', layout(72, 370, 420, 220), {
      url: 'https://example.com',
      sandbox: 'allow-scripts allow-same-origin allow-forms',
      backgroundColor: '#0f172a',
      borderColor: '#334155',
    }, 9),
    createComponent(screenId, basicPage.id, 'cmp-lab-datetime', 'datetime', '日期时间', layout(530, 380, 260, 44), {
      format: 'YYYY-MM-DD HH:mm:ss',
      fontSize: 22,
      color: '#f8fafc',
    }, 10),
    createComponent(screenId, basicPage.id, 'cmp-lab-date', 'date', '日期', layout(530, 438, 180, 38), {
      format: 'YYYY-MM-DD',
      fontSize: 20,
      color: '#93c5fd',
    }, 11),
    createComponent(screenId, basicPage.id, 'cmp-lab-time', 'time', '时间', layout(530, 492, 180, 38), {
      format: 'HH:mm:ss',
      fontSize: 20,
      color: '#7dd3fc',
    }, 12),
    createComponent(screenId, basicPage.id, 'cmp-lab-weekday', 'weekday', '星期', layout(530, 546, 180, 38), {
      fontSize: 20,
      color: '#22c55e',
    }, 13),
    createComponent(screenId, basicPage.id, 'cmp-lab-repeater', 'repeater', '重复器', layout(846, 372, 420, 220), {
      itemsPerLine: 3,
      pageSize: 6,
      sampleRows: repeaterRows,
      itemBorderColor: '#38bdf8',
      itemBackground: 'rgba(15, 47, 81, 0.72)',
    }, 14),
    createComponent(screenId, basicPage.id, 'cmp-lab-carousel', 'carousel', '轮播器', layout(1290, 372, 260, 220), {
      panels: [
        { id: 'lab-panel-1', name: '看板', title: '自动轮播状态' },
        { id: 'lab-panel-2', name: '告警', title: '点击指示器切换' },
      ],
      activePanelId: 'lab-panel-1',
      autoplay: true,
      intervalSeconds: 3,
      indicatorVisible: true,
    }, 15),
    createComponent(screenId, basicPage.id, 'cmp-lab-tabs', 'tabs', '标签页', layout(1580, 372, 260, 220), {
      panels: [
        { id: 'lab-tab-1', name: '总览', title: '总览面板内容' },
        { id: 'lab-tab-2', name: '明细', title: '明细面板内容' },
        { id: 'lab-tab-3', name: '告警', title: '告警面板内容' },
      ],
      activeTabId: 'lab-tab-1',
      headerVisible: true,
      autoPlay: false,
    }, 16),
    createComponent(screenId, basicPage.id, 'cmp-lab-select', 'select', '下拉控件', layout(72, 640, 260, 104), {
      placeholder: '选择渠道',
      value: '自然增长',
      options: [
        { label: '自然增长', value: '自然增长' },
        { label: '广告投放', value: '广告投放' },
        { label: '短视频', value: '短视频' },
      ],
    }, 17),
    createComponent(screenId, basicPage.id, 'cmp-lab-multi', 'multiSelect', '多选控件', layout(360, 640, 260, 126), {
      placeholder: '选择指标',
      value: ['活跃用户', '广告观看'],
      options: [
        { label: '活跃用户', value: '活跃用户' },
        { label: '广告观看', value: '广告观看' },
        { label: '留存率', value: '留存率' },
      ],
    }, 18),
    createComponent(screenId, basicPage.id, 'cmp-lab-tree', 'treeSelect', '树选择控件', layout(650, 640, 260, 104), {
      placeholder: '选择区域',
      value: '华南',
      treeData: [
        { label: '全国', value: '全国', children: [
          { label: '华东', value: '华东' },
          { label: '华南', value: '华南' },
        ] },
      ],
    }, 19),
    createComponent(screenId, basicPage.id, 'cmp-lab-tree-multi', 'treeMultiSelect', '树多选控件', layout(940, 640, 260, 126), {
      placeholder: '选择区域组',
      value: ['华东', '华南'],
      treeData: [
        { label: '全国', value: '全国', children: [
          { label: '华东', value: '华东' },
          { label: '华南', value: '华南' },
          { label: '西南', value: '西南' },
        ] },
      ],
    }, 20),
    createComponent(screenId, basicPage.id, 'cmp-lab-date-picker', 'datePicker', '日期控件', layout(1230, 640, 240, 104), {
      placeholder: '选择日期',
      value: '2026-05-25',
      minDate: '2026-05-01',
      maxDate: '2026-05-31',
    }, 21),
    createComponent(screenId, basicPage.id, 'cmp-lab-hotspot', 'hotspot', '跳转图表库', layout(1580, 662, 260, 72), {
      actionLabel: '查看图表组件库',
      backgroundColor: 'rgba(37, 99, 235, 0.88)',
      borderColor: '#93c5fd',
    }, 22, {
      interactions: [
        interaction('it-lab-chart-page', '切换到图表页', 'click', [
          action('act-lab-chart-page', 'switch-page', { pageId: chartPage.id }, chartPage.id),
        ]),
      ],
    }),
  ]

  const chartTypes: Array<{ type: BigScreenComponent['type'], name: string, rows: Array<Record<string, unknown>>, style?: Record<string, unknown> }> = [
    { type: 'stackedColumn', name: '堆叠柱图', rows: weeklyRows },
    { type: 'percentColumn', name: '百分比柱图', rows: weeklyRows },
    { type: 'stackedBar', name: '堆叠条形图', rows: weeklyRows },
    { type: 'percentBar', name: '百分比条形图', rows: weeklyRows },
    { type: 'bidirectionalBar', name: '双向条形图', rows: regionRows },
    { type: 'dualAxis', name: '双轴图', rows: weeklyRows },
    { type: 'pie', name: '饼图', rows: channelRows },
    { type: 'rose', name: '玫瑰图', rows: channelRows },
    { type: 'waterWave', name: '水波图', rows: metricRows(76, 62, 100), style: { max: 100, unit: '%' } },
    { type: 'wordCloud', name: '词云', rows: wordRows },
    { type: 'circleView', name: '关系气泡', rows: regionRows },
    { type: 'custom', name: '自定义组件占位', rows: [] },
  ]

  components.push(createComponent(screenId, chartPage.id, 'cmp-chart-title', 'title', '图表库标题', layout(72, 42, 680, 72), {
    text: '图表组件库',
    fontSize: 40,
    fontWeight: 700,
    color: '#f8fafc',
  }, 1))

  chartTypes.forEach((item, index) => {
    const col = index % 4
    const row = Math.floor(index / 4)
    components.push(createComponent(screenId, chartPage.id, `cmp-lab-chart-${item.type}`, item.type, item.name, layout(72 + col * 456, 142 + row * 292, 408, 250), {
      ...chartStyle(item.name, ['#38bdf8', '#22c55e', '#f59e0b', '#a78bfa']),
      ...(item.style ?? {}),
    }, index + 2, item.type === 'custom' ? {} : { dataBinding: dataBinding(item.rows) }))
  })

  components.push(
    createComponent(screenId, chartPage.id, 'cmp-chart-back', 'hotspot', '返回默认组件', layout(1450, 1010, 180, 52), {
      actionLabel: '返回默认组件',
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      borderColor: '#38bdf8',
    }, 20, {
      interactions: [
        interaction('it-chart-back', '返回默认组件页', 'click', [
          action('act-chart-back', 'switch-page', { pageId: basicPage.id }, basicPage.id),
        ]),
      ],
    }),
    createComponent(screenId, chartPage.id, 'cmp-chart-earth', 'hotspot', '进入地球页', layout(1660, 1010, 180, 52), {
      actionLabel: '查看 3D 地球',
      backgroundColor: 'rgba(37, 99, 235, 0.88)',
      borderColor: '#93c5fd',
    }, 21, {
      interactions: [
        interaction('it-chart-earth', '进入 3D 地球页', 'click', [
          action('act-chart-earth', 'switch-page', { pageId: earthPage.id }, earthPage.id),
        ]),
      ],
    }),
  )

  const earthComponentId = 'cmp-lab-earth3d'
  components.push(
    createComponent(screenId, earthPage.id, 'cmp-earth-title', 'title', '地球页标题', layout(72, 42, 680, 72), {
      text: '3D 地球与全球飞线',
      fontSize: 40,
      fontWeight: 700,
      color: '#f8fafc',
    }, 1),
    createComponent(screenId, earthPage.id, earthComponentId, 'earth3d', '3D 地球组件', layout(72, 140, 1180, 820), {
      containerConfig: {
        ...defaultEarth3DContainerConfig,
        view: { ...defaultEarth3DContainerConfig.view, longitude: 104, latitude: 25, zoom: 3.6 },
        autoRotate: { enabled: true, speed: 1.2, pauseOnHover: true },
        glow: { enabled: true, range: 1.8, intensity: 1.2, color: '#38bdf8' },
      },
      layers: [
        createGeoLayer(earthComponentId, 'bubble', 0, '#38bdf8'),
        createGeoLayer(earthComponentId, 'flyLine', 1, '#f59e0b'),
      ],
      diagnostics: {
        webgl2: 'ok',
        hardwareAcceleration: 'available',
        blackScreenHint: '',
      },
    }, 2),
    createComponent(screenId, earthPage.id, 'cmp-earth-geo-table', 'table', '全球节点表', layout(1300, 180, 520, 300), {
      title: '全球节点数据',
      rowNumberVisible: true,
      scrollRows: 5,
      colorScheme: ['#38bdf8'],
    }, 3, { dataBinding: dataBinding(geoRows) }),
    createComponent(screenId, earthPage.id, 'cmp-earth-back', 'hotspot', '返回图表库', layout(1580, 860, 240, 72), {
      actionLabel: '返回图表库',
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      borderColor: '#38bdf8',
    }, 4, {
      interactions: [
        interaction('it-earth-back', '返回图表库', 'click', [
          action('act-earth-back', 'switch-page', { pageId: chartPage.id }, chartPage.id),
        ]),
      ],
    }),
  )

  const draftSnapshot = buildSnapshot(screenId, '数字大屏组件能力实验室', [basicPage, chartPage, earthPage], components, [], { layoutPreset: 'dense-side' })
  const publishedSnapshot = { ...draftSnapshot, capturedAt: '2026-05-25T14:10:00+02:00' }

  return {
    id: screenId,
    name: '数字大屏组件能力实验室',
    description: '集中演示默认组件、控件、容器、全量图表类型、3D 地球与发布下线状态。',
    status: 'offline',
    deviceMode: 'pc',
    homePageId: draftSnapshot.homePageId,
    pages: draftSnapshot.pages,
    components: draftSnapshot.components,
    groups: [],
    globalVariables: draftSnapshot.globalVariables,
    assets: draftSnapshot.assets,
    draftSnapshot,
    publishedSnapshot,
    publishConfig: {
      accessMode: 'token',
      accessKey: 'access-component-lab',
      viewUrl: '/big-screens/published/screen-component-lab?accessKey=access-component-lab',
      tokenSecretKeyMasked: 'lab_sk_******_demo',
      tokenExpireSeconds: 3600,
      publishedVersionId: 'version-lab-v1',
      publishStatus: 'offline',
      offlineAt: '2026-05-25T15:40:00+02:00',
    },
    versionCount: 1,
    latestVersionId: 'version-lab-v1',
    currentPublishedVersionId: 'version-lab-v1',
    createdBy: 'Chaoyang Xu',
    updatedBy: 'Chaoyang Xu',
    createdAt: '2026-05-22T14:00:00+02:00',
    updatedAt: '2026-05-25T15:42:00+02:00',
    publishedAt: '2026-05-25T14:10:00+02:00',
  }
}

const buildWideScreen = (): BigScreen => {
  const screenId = 'screen-wide-noc'
  const page = createPage(screenId, 'page-wide-home', '超宽态势', 0, true, '#030712', 3840, 1080)
  const components: BigScreenComponent[] = [
    createComponent(screenId, page.id, 'cmp-wide-title', 'title', '超宽标题', layout(80, 40, 840, 72), {
      text: '32:9 数据运营作战室',
      fontSize: 42,
      fontWeight: 700,
      color: '#f8fafc',
    }, 1),
    createComponent(screenId, page.id, 'cmp-wide-left', 'stackedColumn', '左侧堆叠柱图', layout(80, 160, 760, 360), {
      ...chartStyle('多业务线贡献', ['#38bdf8', '#22c55e', '#f59e0b']),
    }, 2, { dataBinding: dataBinding(weeklyRows) }),
    createComponent(screenId, page.id, 'cmp-wide-map', 'map3d', '中心 3D 地图', layout(940, 110, 1900, 860), {
      containerConfig: defaultMap3DContainerConfig,
      layers: [
        createGeoLayer('cmp-wide-map', 'adminHeat', 0, '#2563eb'),
        createGeoLayer('cmp-wide-map', 'bubble', 1, '#38bdf8'),
        createGeoLayer('cmp-wide-map', 'flyLine', 2, '#f59e0b'),
      ],
      diagnostics: { webgl2: 'ok', hardwareAcceleration: 'available', blackScreenHint: '' },
    }, 3),
    createComponent(screenId, page.id, 'cmp-wide-right', 'dualAxis', '右侧双轴图', layout(2920, 160, 840, 360), {
      ...chartStyle('成本与转化双轴', ['#38bdf8', '#f59e0b']),
    }, 4, { dataBinding: dataBinding(weeklyRows) }),
    createComponent(screenId, page.id, 'cmp-wide-bottom', 'table', '超宽底部表格', layout(80, 600, 760, 360), {
      title: '告警任务清单',
      rowNumberVisible: true,
      scrollRows: 6,
    }, 5, { dataBinding: dataBinding(regionRows) }),
    createComponent(screenId, page.id, 'cmp-wide-ranking', 'rankingList', '右侧排行榜', layout(2920, 600, 840, 360), {
      title: '区域贡献排行',
      colorScheme: ['#38bdf8'],
    }, 6, { dataBinding: dataBinding(regionRows) }),
  ]
  const draftSnapshot = buildSnapshot(screenId, '32:9 数据运营作战室', [page], components, [], {
    ratioType: '32:9',
    layoutPreset: 'wide-32-9-center-focus',
  })
  const publishedSnapshot = { ...draftSnapshot, capturedAt: '2026-05-25T13:40:00+02:00' }

  return {
    id: screenId,
    name: '32:9 数据运营作战室',
    description: '超宽画布演示，覆盖 32:9、中心焦点布局、3D 场景与两侧图表协同。',
    status: 'published',
    deviceMode: 'pc',
    homePageId: draftSnapshot.homePageId,
    pages: draftSnapshot.pages,
    components: draftSnapshot.components,
    groups: [],
    globalVariables: draftSnapshot.globalVariables,
    assets: draftSnapshot.assets,
    draftSnapshot,
    publishedSnapshot,
    publishConfig: {
      accessMode: 'password',
      accessKey: 'access-wide-noc',
      passwordHash: 'mock_hash_123456',
      viewUrl: '/big-screens/published/screen-wide-noc?accessKey=access-wide-noc',
      publishedVersionId: 'version-wide-v1',
      publishStatus: 'published',
    },
    versionCount: 1,
    latestVersionId: 'version-wide-v1',
    currentPublishedVersionId: 'version-wide-v1',
    createdBy: 'DataOps Team',
    updatedBy: 'Chaoyang Xu',
    createdAt: '2026-05-21T09:10:00+02:00',
    updatedAt: '2026-05-25T13:40:00+02:00',
    publishedAt: '2026-05-25T13:40:00+02:00',
  }
}

const operationScreen = buildOperationScreen()
const retentionScreen = buildRetentionScreen()
const labScreen = buildComponentLabScreen()
const wideScreen = buildWideScreen()

export const mockBigScreens: BigScreen[] = [
  operationScreen,
  retentionScreen,
  labScreen,
  wideScreen,
]

export const mockBigScreenVersions: BigScreenVersion[] = [
  {
    id: 'version-operation-v1',
    screenId: operationScreen.id,
    name: '版本1：基础发布闭环',
    versionNo: 1,
    snapshot: {
      ...operationScreen.draftSnapshot,
      capturedAt: '2026-05-24T18:30:00+02:00',
    },
    status: 'history',
    locked: false,
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-24T18:30:00+02:00',
  },
  {
    id: 'version-operation-v2',
    screenId: operationScreen.id,
    name: '版本2：交互与 3D 完整演示',
    versionNo: 2,
    snapshot: operationScreen.draftSnapshot,
    status: 'published',
    locked: true,
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-25T15:18:00+02:00',
  },
  {
    id: 'version-retention-v1',
    screenId: retentionScreen.id,
    name: '草稿评审版',
    versionNo: 1,
    snapshot: retentionScreen.draftSnapshot,
    status: 'history',
    locked: false,
    createdBy: 'Mia Chen',
    createdAt: '2026-05-25T11:20:00+02:00',
  },
  {
    id: 'version-lab-v1',
    screenId: labScreen.id,
    name: '组件能力演示发布版',
    versionNo: 1,
    snapshot: labScreen.draftSnapshot,
    status: 'history',
    locked: true,
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-25T14:08:00+02:00',
  },
  {
    id: 'version-wide-v1',
    screenId: wideScreen.id,
    name: '32:9 作战室发布版',
    versionNo: 1,
    snapshot: wideScreen.draftSnapshot,
    status: 'published',
    locked: true,
    createdBy: 'DataOps Team',
    createdAt: '2026-05-25T13:38:00+02:00',
  },
]

export const mockBigScreenTemplates: BigScreenTemplate[] = [
  {
    id: 'template-operation-command',
    projectId,
    name: '经营指挥中心模板',
    description: '适合管理层会议、运营监控和指挥中心的一屏多页模板，默认已脱敏。',
    coverUrl: 'linear-gradient(135deg, #082f49 0%, #0f766e 52%, #111827 100%)',
    scope: 'project',
    sourceScreenId: operationScreen.id,
    sourceVersionId: 'version-operation-v2',
    snapshot: operationScreen.draftSnapshot,
    isDesensitized: true,
    createdBy: 'Chaoyang Xu',
    updatedBy: 'Chaoyang Xu',
    createdAt: '2026-05-25T15:40:00+02:00',
    updatedAt: '2026-05-25T15:40:00+02:00',
  },
  {
    id: 'template-component-lab',
    projectId,
    name: '组件能力实验室模板',
    description: '用于演示默认组件、容器控件、图表库、3D 地球和交互动作。',
    coverUrl: 'linear-gradient(135deg, #111827 0%, #2563eb 50%, #0f172a 100%)',
    scope: 'shared',
    sourceScreenId: labScreen.id,
    sourceVersionId: 'version-lab-v1',
    snapshot: labScreen.draftSnapshot,
    isDesensitized: true,
    createdBy: 'Chaoyang Xu',
    updatedBy: 'Chaoyang Xu',
    createdAt: '2026-05-25T15:46:00+02:00',
    updatedAt: '2026-05-25T15:46:00+02:00',
  },
  {
    id: 'template-wide-noc',
    projectId,
    name: '32:9 作战室模板',
    description: '适合大屏拼接墙、NOC 监控和指挥大厅。',
    coverUrl: 'linear-gradient(135deg, #020617 0%, #1d4ed8 48%, #111827 100%)',
    scope: 'project',
    sourceScreenId: wideScreen.id,
    sourceVersionId: 'version-wide-v1',
    snapshot: wideScreen.draftSnapshot,
    isDesensitized: true,
    createdBy: 'DataOps Team',
    updatedBy: 'Chaoyang Xu',
    createdAt: '2026-05-25T15:52:00+02:00',
    updatedAt: '2026-05-25T15:52:00+02:00',
  },
]

export const mockBigScreenAssets: BigScreenResourceAsset[] = [
  {
    id: 'asset-bg-frame-blue',
    projectId,
    name: '科技蓝背景框',
    type: 'image',
    category: 'background-frame',
    source: 'official',
    fileUrl: 'https://dummyimage.com/960x540/0f172a/38bdf8&text=Frame',
    fileSize: 860 * 1024,
    mimeType: 'image/png',
    extension: 'png',
    usageCount: 12,
    createdBy: 'System',
    createdAt: '2026-05-20T10:00:00+02:00',
    updatedAt: '2026-05-20T10:00:00+02:00',
  },
  {
    id: 'asset-title-lightline',
    projectId,
    name: '主标题发光线',
    type: 'image',
    category: 'main-title',
    source: 'official',
    fileUrl: 'https://dummyimage.com/760x120/020617/7dd3fc&text=Title+Line',
    fileSize: 420 * 1024,
    mimeType: 'image/png',
    extension: 'png',
    usageCount: 8,
    createdBy: 'System',
    createdAt: '2026-05-20T10:10:00+02:00',
    updatedAt: '2026-05-20T10:10:00+02:00',
  },
  {
    id: 'asset-icon-warning',
    projectId,
    name: '告警图标组',
    type: 'image',
    category: 'icon',
    source: 'official',
    fileUrl: 'https://dummyimage.com/256x256/111827/f59e0b&text=Alert',
    fileSize: 312 * 1024,
    mimeType: 'image/svg+xml',
    extension: 'svg',
    usageCount: 5,
    createdBy: 'System',
    createdAt: '2026-05-20T10:20:00+02:00',
    updatedAt: '2026-05-20T10:20:00+02:00',
  },
  {
    id: 'asset-decoration-flow',
    projectId,
    name: '流光装饰线',
    type: 'image',
    category: 'decoration-line',
    source: 'local-upload',
    fileUrl: 'https://dummyimage.com/720x80/0f172a/22c55e&text=Flow',
    fileSize: 260 * 1024,
    mimeType: 'image/png',
    extension: 'png',
    usageCount: 3,
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-24T09:20:00+02:00',
    updatedAt: '2026-05-24T09:20:00+02:00',
  },
  {
    id: 'asset-video-command-loop',
    projectId,
    name: '指挥中心循环视频',
    type: 'video',
    category: 'other',
    source: 'local-upload',
    fileUrl: 'https://example.com/assets/command-loop.mp4',
    fileSize: 18 * 1024 * 1024,
    mimeType: 'video/mp4',
    extension: 'mp4',
    usageCount: 1,
    warningMessage: '视频体积偏大，DevTools 可提示压缩。',
    createdBy: 'Mia Chen',
    createdAt: '2026-05-24T10:12:00+02:00',
    updatedAt: '2026-05-24T10:12:00+02:00',
  },
  {
    id: 'asset-font-byte-number',
    projectId,
    name: 'ByteNumber 数字字体',
    type: 'font',
    category: 'font',
    source: 'official',
    fileUrl: '/fonts/ByteNumber.woff2',
    fileSize: 420 * 1024,
    mimeType: 'font/woff2',
    extension: 'woff2',
    usageCount: 18,
    licenseConfirmed: true,
    fontFamily: 'ByteNumber',
    createdBy: 'System',
    createdAt: '2026-05-20T11:00:00+02:00',
    updatedAt: '2026-05-20T11:00:00+02:00',
  },
  {
    id: 'asset-font-sourcehan',
    projectId,
    name: 'SourceHanSansCN 字体',
    type: 'font',
    category: 'font',
    source: 'local-upload',
    fileUrl: '/fonts/SourceHanSansCN.woff2',
    fileSize: 780 * 1024,
    mimeType: 'font/woff2',
    extension: 'woff2',
    usageCount: 7,
    licenseConfirmed: true,
    fontFamily: 'SourceHanSansCN',
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-22T11:00:00+02:00',
    updatedAt: '2026-05-22T11:00:00+02:00',
  },
  {
    id: 'asset-template-cover-wide',
    projectId,
    name: '超宽模板封面',
    type: 'template-cover',
    category: 'other',
    source: 'official',
    fileUrl: 'https://dummyimage.com/1280x360/020617/38bdf8&text=32:9+Template',
    fileSize: 520 * 1024,
    mimeType: 'image/png',
    extension: 'png',
    usageCount: 2,
    createdBy: 'System',
    createdAt: '2026-05-21T11:00:00+02:00',
    updatedAt: '2026-05-21T11:00:00+02:00',
  },
]

export const mockBigScreenPresentationPlans: BigScreenPresentationPlan[] = [
  {
    id: 'presentation-daily-command',
    projectId,
    name: '每日经营轮播',
    loopMode: 'loop',
    status: 'active',
    items: [
      {
        id: 'presentation-item-operation',
        screenId: operationScreen.id,
        publishedVersionId: 'version-operation-v2',
        displayName: '经营指挥中心大屏',
        durationSeconds: 30,
        order: 1,
      },
      {
        id: 'presentation-item-wide',
        screenId: wideScreen.id,
        publishedVersionId: 'version-wide-v1',
        displayName: '32:9 数据运营作战室',
        durationSeconds: 24,
        order: 2,
      },
      {
        id: 'presentation-item-lab-offline',
        screenId: labScreen.id,
        publishedVersionId: 'version-lab-v1',
        displayName: '组件能力实验室（已下线态）',
        durationSeconds: 18,
        order: 3,
      },
    ],
    createdBy: 'Chaoyang Xu',
    createdAt: '2026-05-25T16:10:00+02:00',
    updatedAt: '2026-05-25T16:24:00+02:00',
  },
  {
    id: 'presentation-review-draft',
    projectId,
    name: '评审备用演播单',
    loopMode: 'once',
    status: 'draft',
    items: [
      {
        id: 'presentation-item-retention-draft',
        screenId: retentionScreen.id,
        publishedVersionId: 'version-retention-v1',
        displayName: '新用户留存复盘草稿评审',
        durationSeconds: 20,
        order: 1,
      },
      {
        id: 'presentation-item-missing',
        screenId: 'screen-missing-demo',
        displayName: '缺失大屏占位',
        durationSeconds: 10,
        order: 2,
      },
    ],
    createdBy: 'Mia Chen',
    createdAt: '2026-05-25T12:10:00+02:00',
    updatedAt: '2026-05-25T12:10:00+02:00',
  },
]
