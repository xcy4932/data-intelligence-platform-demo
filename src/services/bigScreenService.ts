import {
  mockBigScreenAssets,
  mockBigScreenPresentationPlans,
  mockBigScreenTemplates,
  mockBigScreenVersions,
  mockBigScreens,
} from '@/mock/bigScreens'
import { chartComponentTypes } from '@/components/big-screen/chartComponentRegistry'
import { getBigScreenChartDiagnostics } from '@/components/big-screen/chartDataAdapter'
import type {
  BigScreen,
  BigScreenComponent,
  BigScreenDevIssue,
  BigScreenDevToolsCheckResult,
  BigScreenListFilters,
  BigScreenListResult,
  BigScreenPage,
  BigScreenPresentationPlan,
  BigScreenPresentationRuntime,
  BigScreenPreviewSession,
  BigScreenPublishedAccessResult,
  BigScreenResourceAsset,
  BigScreenSharingTokenResult,
  BigScreenSmartVJob,
  BigScreenSmartVJobType,
  BigScreenSnapshot,
  BigScreenTemplate,
  BigScreenVersion,
  CreateBigScreenRequest,
  CreatePreviewRequest,
  CreateBigScreenTemplateRequest,
  CreateBigScreenSmartVJobRequest,
  PublishBigScreenRequest,
  PublishBigScreenResponse,
  SaveBigScreenRequest,
  SaveBigScreenPresentationPlanRequest,
  UpdateBigScreenTemplateRequest,
  UploadBigScreenAssetRequest,
} from '@/types/bigScreen'

const MOCK_DELAY = 180
const SCREEN_STORAGE_KEY = 'dataops-demo.bigScreens'
const VERSION_STORAGE_KEY = 'dataops-demo.bigScreenVersions'
const PREVIEW_STORAGE_KEY = 'dataops-demo.bigScreenPreviewSessions'
const TEMPLATE_STORAGE_KEY = 'dataops-demo.bigScreenTemplates'
const ASSET_STORAGE_KEY = 'dataops-demo.bigScreenAssets'
const PRESENTATION_STORAGE_KEY = 'dataops-demo.bigScreenPresentationPlans'
const DEVTOOLS_STORAGE_KEY = 'dataops-demo.bigScreenDevIssues'
const SMARTV_STORAGE_KEY = 'dataops-demo.bigScreenSmartVJobs'
const SEED_VERSION_STORAGE_KEY = 'dataops-demo.bigScreenSeedVersion'
const DEMO_SEED_VERSION = '2026-05-25-expanded-big-screen-demo-v1'
const BIG_SCREEN_STORAGE_KEYS = [
  SCREEN_STORAGE_KEY,
  VERSION_STORAGE_KEY,
  PREVIEW_STORAGE_KEY,
  TEMPLATE_STORAGE_KEY,
  ASSET_STORAGE_KEY,
  PRESENTATION_STORAGE_KEY,
  DEVTOOLS_STORAGE_KEY,
  SMARTV_STORAGE_KEY,
]

const currentUser = 'Chaoyang Xu'

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(clone(payload)), MOCK_DELAY)
  })

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const readStorage = <T>(key: string, fallback: T): T => {
  try {
    const rawValue = window.localStorage.getItem(key)
    return rawValue ? JSON.parse(rawValue) as T : clone(fallback)
  } catch {
    return clone(fallback)
  }
}

const writeStorage = <T>(key: string, value: T): void => {
  window.localStorage.setItem(key, JSON.stringify(value))
}

const resetOutdatedDemoStorage = (): void => {
  try {
    if (window.localStorage.getItem(SEED_VERSION_STORAGE_KEY) === DEMO_SEED_VERSION) {
      return
    }

    BIG_SCREEN_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))
    window.localStorage.setItem(SEED_VERSION_STORAGE_KEY, DEMO_SEED_VERSION)
  } catch {
    // Demo storage is best-effort; fallback mock data still keeps the module usable.
  }
}

resetOutdatedDemoStorage()

let bigScreens = readStorage<BigScreen[]>(SCREEN_STORAGE_KEY, mockBigScreens)
let bigScreenVersions = readStorage<BigScreenVersion[]>(VERSION_STORAGE_KEY, mockBigScreenVersions)
let previewSessions = readStorage<Record<string, BigScreenPreviewSession>>(PREVIEW_STORAGE_KEY, {})
let bigScreenTemplates = readStorage<BigScreenTemplate[]>(TEMPLATE_STORAGE_KEY, mockBigScreenTemplates)
let bigScreenAssets = readStorage<BigScreenResourceAsset[]>(ASSET_STORAGE_KEY, mockBigScreenAssets)
let presentationPlans = readStorage<BigScreenPresentationPlan[]>(PRESENTATION_STORAGE_KEY, mockBigScreenPresentationPlans)
let devIssues = readStorage<BigScreenDevIssue[]>(DEVTOOLS_STORAGE_KEY, [])
let smartVJobs = readStorage<BigScreenSmartVJob[]>(SMARTV_STORAGE_KEY, [])

const persistScreens = (): void => writeStorage(SCREEN_STORAGE_KEY, bigScreens)

const persistVersions = (): void => writeStorage(VERSION_STORAGE_KEY, bigScreenVersions)

const prunePreviewSessions = (): void => {
  const nowTime = Date.now()

  previewSessions = Object.fromEntries(
    Object.entries(previewSessions)
      .filter(([, session]) => Date.parse(session.expiresAt) >= nowTime)
      .sort(([, left], [, right]) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, 3),
  )
}

const persistPreviews = (): void => {
  prunePreviewSessions()

  try {
    writeStorage(PREVIEW_STORAGE_KEY, previewSessions)
  } catch {
    window.localStorage.removeItem(PREVIEW_STORAGE_KEY)
  }
}

const persistTemplates = (): void => writeStorage(TEMPLATE_STORAGE_KEY, bigScreenTemplates)

const persistAssets = (): void => writeStorage(ASSET_STORAGE_KEY, bigScreenAssets)

const persistPresentationPlans = (): void => writeStorage(PRESENTATION_STORAGE_KEY, presentationPlans)

const persistDevIssues = (): void => writeStorage(DEVTOOLS_STORAGE_KEY, devIssues)

const persistSmartVJobs = (): void => writeStorage(SMARTV_STORAGE_KEY, smartVJobs)

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const now = (): string => new Date().toISOString()

const toBase64 = (value: string): string => window.btoa(unescape(encodeURIComponent(value)))

const fromBase64 = (value: string): string => decodeURIComponent(escape(window.atob(value)))

const hashPassword = (password: string): string => `sha256-demo:${toBase64(password)}`

const buildAccessKey = (screenId: string): string => `access-${screenId}-${Math.random().toString(36).slice(2, 10)}`

const buildSecretKey = (screenId: string): string => `secret-${screenId}-${Math.random().toString(36).slice(2, 14)}`

const maskSecretKey = (secretKey?: string): string | undefined =>
  secretKey ? `${secretKey.slice(0, 8)}******${secretKey.slice(-4)}` : undefined

const syncScreenRuntime = (screen: BigScreen): BigScreen => {
  screen.pages = clone(screen.draftSnapshot.pages)
  screen.components = clone(screen.draftSnapshot.components)
  screen.groups = clone(screen.draftSnapshot.groups)
  screen.globalVariables = clone(screen.draftSnapshot.globalVariables)
  screen.assets = clone(screen.draftSnapshot.assets)
  screen.homePageId = screen.draftSnapshot.homePageId
  screen.deviceMode = screen.draftSnapshot.deviceMode
  screen.versionCount = bigScreenVersions.filter((version) => version.screenId === screen.id).length
  screen.latestVersionId = bigScreenVersions
    .filter((version) => version.screenId === screen.id)
    .sort((left, right) => right.versionNo - left.versionNo)[0]?.id

  return screen
}

const getMutableScreen = (screenId: string): BigScreen => {
  const screen = bigScreens.find((item) => item.id === screenId)

  if (!screen) {
    throw new Error('数字大屏不存在或无访问权限')
  }

  return syncScreenRuntime(screen)
}

const getHomePage = (snapshot: BigScreenSnapshot): string => {
  const homePage = snapshot.pages.find((page) => page.id === snapshot.homePageId)

  if (!homePage) {
    throw new Error('访问首页不存在，请重新设置')
  }

  return homePage.id
}

const validateSnapshot = (snapshot: BigScreenSnapshot): void => {
  if (!snapshot.name.trim()) {
    throw new Error('大屏名称不能为空')
  }

  if (snapshot.pages.length === 0) {
    throw new Error('至少需要保留一个页面')
  }

  getHomePage(snapshot)

  const componentIds = new Set<string>()

  snapshot.components.forEach((component) => {
    if (componentIds.has(component.id)) {
      throw new Error(`组件 ID 重复：${component.id}`)
    }

    componentIds.add(component.id)

    if (component.layout.width <= 0 || component.layout.height <= 0) {
      throw new Error(`组件「${component.name}」尺寸必须大于 0`)
    }

    const animationConfigs = [component.animations.enter, component.animations.exit]
    animationConfigs.forEach((animation) => {
      const durationMs = Number(animation.durationMs)
      const startTimeMs = Number(animation.startTimeMs)

      if (animation.enabled && (!Number.isFinite(durationMs) || !Number.isFinite(startTimeMs))) {
        throw new Error(`组件「${component.name}」动画时长和延迟必须是有效数字`)
      }

      if (animation.enabled && (durationMs < 0 || startTimeMs < 0)) {
        throw new Error(`组件「${component.name}」动画时长和延迟不能小于 0`)
      }
    })
  })
}

const buildLayoutGuideComponents = (
  screenId: string,
  page: BigScreenPage,
  layoutPreset: CreateBigScreenRequest['layoutPreset'],
): BigScreenComponent[] => {
  if (!layoutPreset || layoutPreset === 'blank') {
    return []
  }

  const scaleX = page.width / (layoutPreset.startsWith('wide') ? 3840 : 1920)
  const scaleY = page.height / 1080
  const boxes: Array<{ name: string, x: number, y: number, width: number, height: number }> = []

  if (layoutPreset === 'sparse-center') {
    boxes.push(
      { name: '标题区', x: 0, y: 0, width: 1920, height: 90 },
      { name: '主视觉区', x: 420, y: 120, width: 1080, height: 720 },
      { name: '左下图表', x: 60, y: 820, width: 540, height: 220 },
      { name: '右下图表', x: 1320, y: 820, width: 540, height: 220 },
      { name: '右上指标 1', x: 1500, y: 120, width: 360, height: 120 },
      { name: '右上指标 2', x: 1500, y: 260, width: 360, height: 120 },
    )
  } else if (layoutPreset === 'dense-center' || layoutPreset === 'dense-side') {
    boxes.push(
      { name: '标题区', x: 0, y: 0, width: 1920, height: 80 },
      { name: '主视觉区', x: 480, y: 140, width: 960, height: 620 },
      { name: '左侧图表 1', x: 60, y: 230, width: 360, height: 220 },
      { name: '左侧图表 2', x: 60, y: 470, width: 360, height: 220 },
      { name: '左侧图表 3', x: 60, y: 710, width: 360, height: 300 },
      { name: '右侧图表 1', x: 1500, y: 230, width: 360, height: 220 },
      { name: '右侧图表 2', x: 1500, y: 470, width: 360, height: 220 },
      { name: '右侧图表 3', x: 1500, y: 710, width: 360, height: 300 },
    )
  } else if (layoutPreset === 'no-main-visual') {
    boxes.push(
      { name: '大图表区', x: 60, y: 120, width: 880, height: 420 },
      { name: '右上图表', x: 980, y: 120, width: 880, height: 420 },
      { name: '左下图表', x: 60, y: 580, width: 560, height: 380 },
      { name: '中下图表', x: 680, y: 580, width: 560, height: 380 },
      { name: '右下图表', x: 1300, y: 580, width: 560, height: 380 },
    )
  } else {
    boxes.push(
      { name: '标题区', x: 0, y: 0, width: 3840, height: 90 },
      { name: '左侧栏', x: 60, y: 130, width: 760, height: 880 },
      { name: '中央主视觉', x: 880, y: 130, width: 2080, height: 880 },
      { name: '右侧栏', x: 3020, y: 130, width: 760, height: 880 },
    )
  }

  return boxes.map((box, index) => ({
    id: createId('guide'),
    pageId: page.id,
    screenId,
    type: 'rectangle',
    name: `布局占位 · ${box.name}`,
    layout: {
      x: Math.round(box.x * scaleX),
      y: Math.round(box.y * scaleY),
      width: Math.round(box.width * scaleX),
      height: Math.round(box.height * scaleY),
      rotate: 0,
      opacity: 72,
      lockAspectRatio: false,
      overflowHidden: false,
    },
    style: {
      backgroundColor: 'rgba(37, 99, 235, 0.08)',
      borderColor: '#38bdf8',
      borderWidth: 1,
      borderRadius: 8,
      borderStyle: 'dashed',
      text: box.name,
      color: '#93c5fd',
    },
    interactions: [],
    animations: {
      enter: { enabled: false, type: 'none', durationMs: 0, startTimeMs: 0, easing: 'linear' },
      exit: { enabled: false, type: 'none', durationMs: 0, startTimeMs: 0, easing: 'linear' },
    },
    visible: true,
    locked: false,
    zIndex: index + 1,
    marker: 'layout-guide',
    createdAt: now(),
    updatedAt: now(),
  }))
}

const buildDefaultSnapshot = (
  screenId: string,
  name: string,
  deviceMode: 'pc' | 'mobile',
  options: Pick<CreateBigScreenRequest, 'ratioType' | 'canvasWidth' | 'canvasHeight' | 'layoutPreset'> = {},
): BigScreenSnapshot => {
  const pageId = createId('page')
  const captureTime = now()
  const ratioType = options.ratioType ?? (deviceMode === 'mobile' ? 'custom' : '16:9')
  const pageWidth = options.canvasWidth ?? (deviceMode === 'mobile' ? 375 : ratioType === '32:9' ? 3840 : 1920)
  const pageHeight = options.canvasHeight ?? (deviceMode === 'mobile' ? 812 : 1080)
  const page: BigScreenPage = {
    id: pageId,
    screenId,
    name: '首页',
    width: pageWidth,
    height: pageHeight,
    background: {
      type: 'color',
      color: '#08111f',
      opacity: 100,
    },
    componentIds: [],
    interactionEvents: [],
    sortIndex: 0,
    isHomePage: true,
  }
  const components = buildLayoutGuideComponents(screenId, page, options.layoutPreset)
  page.componentIds = components.map((component) => component.id)

  return {
    screenId,
    name,
    deviceMode,
    ratioType,
    layoutPreset: options.layoutPreset ?? 'blank',
    homePageId: pageId,
    pages: [page],
    components,
    groups: [],
    globalVariables: [],
    assets: [],
    capturedAt: captureTime,
  }
}

const defaultAnimationConfig = () => ({
  enter: { enabled: false, type: 'none' as const, durationMs: 0, startTimeMs: 0, easing: 'linear' as const },
  exit: { enabled: false, type: 'none' as const, durationMs: 0, startTimeMs: 0, easing: 'linear' as const },
})

const createSmartVComponent = (
  screenId: string,
  pageId: string,
  type: BigScreenComponent['type'],
  name: string,
  layout: BigScreenComponent['layout'],
  style: Record<string, unknown>,
  zIndex: number,
  dataBinding?: BigScreenComponent['dataBinding'],
): BigScreenComponent => ({
  id: createId('smart-component'),
  pageId,
  screenId,
  type,
  name,
  layout,
  style,
  dataBinding,
  interactions: [],
  animations: defaultAnimationConfig(),
  visible: true,
  locked: false,
  zIndex,
  marker: 'smart-v',
  createdAt: now(),
  updatedAt: now(),
})

const scaleFontSize = (value: unknown, ratio: number, minimum = 12): number | undefined => {
  const size = Number(value)
  return Number.isFinite(size) ? Math.max(minimum, Math.round(size * ratio)) : undefined
}

const buildMobileSnapshot = (snapshot: BigScreenSnapshot, input: Record<string, unknown>): BigScreenSnapshot => {
  const width = Number(input.deviceWidth ?? 375)
  const margin = 16
  const gap = 12
  let cursorY = 20
  const nextSnapshot = clone(snapshot)
  const pageIdMap = new Map(nextSnapshot.pages.map((page) => [page.id, createId('mobile-page')]))
  const firstPageId = pageIdMap.get(nextSnapshot.homePageId) ?? createId('mobile-page')
  const orderedComponents = [...nextSnapshot.components]
    .filter((component) => component.visible)
    .sort((left, right) => left.pageId.localeCompare(right.pageId) || left.layout.y - right.layout.y || left.layout.x - right.layout.x)

  const components = orderedComponents.map((component, index) => {
    const isTitle = component.type === 'title'
    const isMetric = component.type === 'metricCard' || component.type === 'flipNumber'
    const isDecorative = component.type === 'rectangle' || component.type === 'circle'
    const height = isTitle
      ? Math.max(48, Math.min(84, component.layout.height * 0.56))
      : isMetric
        ? Math.max(72, Math.min(110, component.layout.height * 0.52))
        : isDecorative
          ? Math.max(36, Math.min(72, component.layout.height * 0.28))
          : Math.max(220, Math.min(320, component.layout.height * 0.42))
    const nextComponent: BigScreenComponent = {
      ...clone(component),
      id: createId('mobile-component'),
      screenId: snapshot.screenId,
      pageId: firstPageId,
      layout: {
        ...component.layout,
        x: margin,
        y: Math.round(cursorY),
        width: width - margin * 2,
        height: Math.round(height),
        rotate: 0,
      },
      style: {
        ...component.style,
        fontSize: scaleFontSize(component.style.fontSize, isTitle ? 0.56 : 0.72, isTitle ? 18 : 12) ?? component.style.fontSize,
        lineHeight: component.style.lineHeight ?? 1.35,
      },
      zIndex: index + 1,
      marker: component.marker ? `${component.marker},smart-v-mobile` : 'smart-v-mobile',
      updatedAt: now(),
    }

    cursorY += height + gap
    return nextComponent
  })
  const page = {
    ...clone(nextSnapshot.pages.find((item) => item.id === snapshot.homePageId) ?? nextSnapshot.pages[0]!),
    id: firstPageId,
    screenId: snapshot.screenId,
    name: '移动端布局',
    width,
    height: Math.max(812, Math.ceil(cursorY + 24)),
    componentIds: components.map((component) => component.id),
    isHomePage: true,
  }

  return {
    ...nextSnapshot,
    deviceMode: 'mobile',
    ratioType: 'custom',
    layoutPreset: 'blank',
    homePageId: firstPageId,
    pages: [page],
    components,
    groups: [],
    capturedAt: now(),
  }
}

type SmartVMetricRow = {
  position: string
  section: string
  metric: string
  dimension: string
  chartType: string
  queryName: string
}

const normalizeMetricRows = (value: unknown): SmartVMetricRow[] => {
  if (!Array.isArray(value)) {
    return [
      { position: '顶部', section: '核心指标', metric: '活跃用户', dimension: '日期', chartType: '指标卡', queryName: '' },
      { position: '中间', section: '趋势分析', metric: '广告观看次数', dimension: '日期', chartType: '折线图', queryName: '' },
      { position: '左边', section: '区域排行', metric: '播放完成率', dimension: '地区', chartType: '排行榜', queryName: '' },
      { position: '右边', section: '渠道结构', metric: '转化率', dimension: '渠道', chartType: '饼图', queryName: '' },
    ]
  }

  return value.map((row) => {
    const record = row && typeof row === 'object' ? row as Record<string, unknown> : {}
    return {
      position: String(record.position ?? record['位置'] ?? ''),
      section: String(record.section ?? record['板块名称'] ?? ''),
      metric: String(record.metric ?? record['指标'] ?? ''),
      dimension: String(record.dimension ?? record['维度'] ?? ''),
      chartType: String(record.chartType ?? record['图表类型'] ?? ''),
      queryName: String(record.queryName ?? record['数据查询'] ?? ''),
    }
  })
}

const chartTypeMap: Record<string, BigScreenComponent['type']> = {
  指标卡: 'metricCard',
  翻牌器: 'flipNumber',
  柱状图: 'groupedColumn',
  折线图: 'line',
  饼图: 'pie',
  排行榜: 'rankingList',
  表格: 'table',
  地图: 'map3d',
}

const buildMetricSystemSnapshot = (snapshot: BigScreenSnapshot, input: Record<string, unknown>): BigScreenSnapshot => {
  const rows = normalizeMetricRows(input.metricRows)
  const invalid = rows.find((row) => !row.position || !row.section || !row.metric || !row.chartType)
  if (invalid) {
    throw new Error('指标体系表格缺少位置、板块名称、指标或图表类型')
  }

  const nextSnapshot = clone(snapshot)
  const basePage = clone(nextSnapshot.pages.find((item) => item.id === nextSnapshot.homePageId) ?? nextSnapshot.pages[0]!)
  const page: BigScreenPage = {
    ...basePage,
    name: String(input.screenName ?? nextSnapshot.name ?? '指标体系大屏'),
    width: 1920,
    height: 1080,
    background: { type: 'color' as const, color: '#06111f', opacity: 100 },
    componentIds: [],
  }
  const title = createSmartVComponent(snapshot.screenId, page.id, 'title', '智能生成标题', {
    x: 64,
    y: 38,
    width: 860,
    height: 78,
    rotate: 0,
    opacity: 100,
    lockAspectRatio: false,
    overflowHidden: false,
  }, {
    text: page.name,
    fontSize: 42,
    fontWeight: 700,
    color: '#f8fafc',
    textAlign: 'left',
  }, 1)
  const slots = [
    { x: 64, y: 150, width: 420, height: 180 },
    { x: 524, y: 150, width: 820, height: 360 },
    { x: 1384, y: 150, width: 470, height: 360 },
    { x: 64, y: 550, width: 560, height: 420 },
    { x: 664, y: 550, width: 560, height: 420 },
    { x: 1264, y: 550, width: 590, height: 420 },
  ]
  const components = [
    title,
    ...rows.slice(0, slots.length).map((row, index) => {
      const slot = slots[index]!
      const type = chartTypeMap[row.chartType || '柱状图'] ?? 'groupedColumn'
      const staticRows = [
        { category: row.dimension || '本期', series: row.section, value: 12860 + index * 1200, compareValue: 9800 + index * 900, target: 16000 },
        { category: row.dimension ? `上期${row.dimension}` : '上期', series: row.section, value: 10240 + index * 900, compareValue: 8800 + index * 700, target: 15000 },
        { category: row.dimension ? `目标${row.dimension}` : '目标', series: row.section, value: 15200 + index * 800, compareValue: 9300 + index * 600, target: 17000 },
      ]
      return createSmartVComponent(snapshot.screenId, page.id, type, row.section, {
        ...slot,
        rotate: 0,
        opacity: 100,
        lockAspectRatio: false,
        overflowHidden: false,
      }, {
        title: row.section,
        value: staticRows[0]?.value,
        suffix: '',
        trend: '+12.6%',
        color: ['#38bdf8', '#34d399', '#f59e0b', '#a78bfa'][index % 4],
        text: row.metric,
      }, index + 2, {
        sourceType: row.queryName ? 'dataset' : 'static',
        sourceId: row.queryName || undefined,
        fields: [
          { slot: 'dimension', fieldName: 'category', fieldType: 'dimension' },
          { slot: 'series', fieldName: 'series', fieldType: 'dimension' },
          { slot: 'measure', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
        ],
        fieldSlots: {
          dimension: ['category'],
          series: ['series'],
          measure: ['value'],
        },
        updateMode: 'manual',
        staticRows,
        lastQueryState: { status: 'idle' },
      })
    }),
  ]
  page.componentIds = components.map((component) => component.id)

  return {
    ...nextSnapshot,
    name: page.name,
    deviceMode: 'pc',
    ratioType: '16:9',
    layoutPreset: String(input.templatePreset ?? 'dense-center') as BigScreenSnapshot['layoutPreset'],
    pages: [page],
    homePageId: page.id,
    components,
    groups: [],
    capturedAt: now(),
  }
}

const themePresets = {
  techBlue: {
    name: '科技蓝',
    background: '#06111f',
    title: '#f8fafc',
    text: '#cbd5e1',
    colors: ['#38bdf8', '#2563eb', '#22d3ee', '#14b8a6'],
    fontFamily: 'SourceHanSansCN',
  },
  emerald: {
    name: '冷绿监控',
    background: '#052016',
    title: '#ecfdf5',
    text: '#bbf7d0',
    colors: ['#34d399', '#10b981', '#84cc16', '#2dd4bf'],
    fontFamily: 'OPPOSans-H',
  },
  amber: {
    name: '金色经营',
    background: '#16130a',
    title: '#fff7ed',
    text: '#fed7aa',
    colors: ['#f59e0b', '#f97316', '#facc15', '#fb7185'],
    fontFamily: 'Outfit',
  },
}

const applyThemeSnapshot = (snapshot: BigScreenSnapshot, input: Record<string, unknown>): { snapshot: BigScreenSnapshot, themeName: string } => {
  const key = String(input.themeKey ?? 'techBlue') as keyof typeof themePresets
  const theme = themePresets[key] ?? themePresets.techBlue
  const nextSnapshot = clone(snapshot)

  return {
    themeName: theme.name,
    snapshot: {
      ...nextSnapshot,
      pages: nextSnapshot.pages.map((page) => ({
        ...page,
        background: { ...page.background, type: 'color', color: theme.background, opacity: 100 },
      })),
      components: nextSnapshot.components.map((component, index) => ({
        ...component,
        style: {
          ...component.style,
          color: component.type === 'title' ? theme.title : component.style.color ?? theme.text,
          fontFamily: theme.fontFamily,
          backgroundColor: component.type === 'rectangle' ? 'rgba(15, 23, 42, 0.42)' : component.style.backgroundColor,
          borderColor: component.style.borderColor ?? theme.colors[index % theme.colors.length],
          palette: theme.colors,
        },
        updatedAt: now(),
      })),
      capturedAt: now(),
    },
  }
}

const buildDocSearchOutput = (input: Record<string, unknown>) => {
  const question = String(input.question ?? '')
  const documents = [
    {
      title: '数字大屏管理与技巧 PRD',
      summary: '模板、资源、自定义字体、版本发布、演播厅、DevTools 和智能小助手的完整规则。',
      path: '数字大屏管理与技巧 PRD.docx',
    },
    {
      title: '数字大屏数据源与交互 PRD',
      summary: '统一数据源、字段槽、筛选排序、刷新策略和图表联动能力。',
      path: '数字大屏数据源与交互 PRD.docx',
    },
    {
      title: '数字大屏图表组件 PRD',
      summary: '指标卡、表格、柱线饼、排行榜等图表组件配置规范。',
      path: '数字大屏图表组件PRD.docx',
    },
  ]

  return {
    answer: question
      ? `已检索数字大屏文档库。关于“${question}”，建议优先查看管理与技巧 PRD 中的对应章节；如果涉及数据绑定和联动，再结合数据源与交互 PRD 配置字段槽、筛选和事件响应。`
      : '请输入一个数字大屏相关问题，例如“如何共享为模板”或“Token 发布怎么配置”。',
    documents,
  }
}

const getSmartVSteps = (type: BigScreenSmartVJobType): string[] => {
  if (type === 'mobile-layout-conversion') {
    return ['读取当前网页端大屏', '识别标题、指标、图表与主视觉', '重排移动端区块', '适配字体和间距', '生成移动端布局']
  }

  if (type === 'metric-system-generation') {
    return ['校验指标体系表格', '解析板块位置和图表类型', '生成布局结构', '绑定 mock 或指定查询', '应用主题并生成大屏']
  }

  if (type === 'theme-switch') {
    return ['读取当前主题和组件样式', '替换背景和色板', '统一字体层级', '保留数据源与交互', '生成主题切换结果']
  }

  return ['检索数字大屏文档库', '匹配相关章节', '生成摘要答案']
}

const buildSmartVOutput = (
  type: BigScreenSmartVJobType,
  snapshot: BigScreenSnapshot,
  input: Record<string, unknown>,
): NonNullable<BigScreenSmartVJob['output']> => {
  if (type === 'mobile-layout-conversion') {
    return {
      snapshot: buildMobileSnapshot(snapshot, input),
      operationSummary: '已生成移动端单列布局，标题、指标卡和主视觉已按阅读顺序重排。',
    }
  }

  if (type === 'metric-system-generation') {
    return {
      snapshot: buildMetricSystemSnapshot(snapshot, input),
      operationSummary: '已根据指标体系生成大屏结构，并为未指定查询的图表绑定 mock 数据。',
    }
  }

  if (type === 'theme-switch') {
    const themed = applyThemeSnapshot(snapshot, input)
    return {
      snapshot: themed.snapshot,
      themeName: themed.themeName,
      operationSummary: `已切换为「${themed.themeName}」主题，保留组件位置、数据源和交互配置。`,
    }
  }

  return buildDocSearchOutput(input)
}

const sortScreens = (items: BigScreen[], sortMode: BigScreenListFilters['sortMode']): BigScreen[] => {
  if (sortMode === 'updated_asc') {
    return [...items].sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
  }

  if (sortMode === 'name_asc') {
    return [...items].sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
  }

  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

const desensitizeText = (value: string): string => {
  if (!value) {
    return value
  }

  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
    const [name, domain] = value.split('@')
    return `${name?.slice(0, 1) ?? '*'}******${name?.slice(-1) ?? '*'}@${domain}`
  }

  if (/^1\d{10}$/.test(value)) {
    return `${value.slice(0, 3)}****${value.slice(-4)}`
  }

  if (value.length <= 2) {
    return '*'.repeat(value.length)
  }

  return `${value.slice(0, 1)}${'*'.repeat(Math.max(1, value.length - 2))}${value.slice(-1)}`
}

const desensitizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined || value === '') {
    return value
  }

  if (typeof value === 'number') {
    const sign = value < 0 ? -1 : 1
    return Math.abs(value) * (Math.floor(Math.random() * 10) + 1) * sign
  }

  if (typeof value === 'string') {
    const numericValue = Number(value)
    if (Number.isFinite(numericValue) && value.trim() !== '') {
      return String(desensitizeValue(numericValue))
    }

    return desensitizeText(value)
  }

  return value
}

const sanitizeDataBindingForTemplate = (component: BigScreenComponent, isDesensitized: boolean): BigScreenComponent => {
  if (!component.dataBinding) {
    return component
  }

  const parsedRows = component.dataBinding.lastQueryState?.parsedTable?.rows.map((row) => row.values) ?? []
  const sourceRows = parsedRows.length ? parsedRows : component.dataBinding.staticRows ?? []
  const staticRows = sourceRows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, isDesensitized ? desensitizeValue(value) : value])),
  )

  return {
    ...component,
    dataBinding: {
      ...component.dataBinding,
      sourceType: 'static',
      sourceId: undefined,
      sourceConfig: {},
      staticRows,
      lastQueryState: { status: 'idle' },
    },
  }
}

const buildTemplateSnapshot = (snapshot: BigScreenSnapshot, isDesensitized: boolean): BigScreenSnapshot => ({
  ...clone(snapshot),
  components: snapshot.components.map((component) => sanitizeDataBindingForTemplate(clone(component), isDesensitized)),
  capturedAt: now(),
})

const cloneSnapshotForScreen = (snapshot: BigScreenSnapshot, screenId: string, name: string): BigScreenSnapshot => {
  const idMap = new Map<string, string>()
  const mapId = (oldId: string, prefix: string): string => {
    if (!idMap.has(oldId)) {
      idMap.set(oldId, createId(prefix))
    }

    return idMap.get(oldId)!
  }

  const pages = snapshot.pages.map((page, index) => ({
    ...clone(page),
    id: mapId(page.id, 'page'),
    screenId,
    sortIndex: index,
  }))
  const components = snapshot.components.map((component) => ({
    ...clone(component),
    id: mapId(component.id, 'component'),
    pageId: mapId(component.pageId, 'page'),
    screenId,
    parentGroupId: component.parentGroupId ? mapId(component.parentGroupId, 'group') : undefined,
    createdAt: now(),
    updatedAt: now(),
  }))
  const groups = snapshot.groups.map((group) => ({
    ...clone(group),
    id: mapId(group.id, 'group'),
    screenId,
    pageId: mapId(group.pageId, 'page'),
    componentIds: group.componentIds.map((componentId) => mapId(componentId, 'component')),
  }))

  return {
    ...clone(snapshot),
    screenId,
    name,
    homePageId: mapId(snapshot.homePageId, 'page'),
    pages: pages.map((page) => ({
      ...page,
      componentIds: page.componentIds.map((componentId) => mapId(componentId, 'component')),
      interactionEvents: page.interactionEvents ?? [],
    })),
    components,
    groups,
    globalVariables: snapshot.globalVariables.map((variable) => ({ ...clone(variable), id: mapId(variable.id, 'variable') })),
    assets: clone(snapshot.assets),
    capturedAt: now(),
  }
}

const createVersionRecord = (screen: BigScreen, name?: string): BigScreenVersion => {
  const versions = bigScreenVersions.filter((version) => version.screenId === screen.id)

  if (versions.length >= 20) {
    throw new Error('最多支持创建 20 个版本，请删除旧版本后再创建')
  }

  const maxVersionNo = versions.reduce((max, version) => Math.max(max, version.versionNo), 0)
  const versionNo = maxVersionNo + 1
  const snapshot = {
    ...clone(screen.draftSnapshot),
    capturedAt: now(),
  }
  const version: BigScreenVersion = {
    id: createId('version'),
    screenId: screen.id,
    name: name?.trim() || `版本${versionNo}`,
    versionNo,
    snapshot,
    status: 'history',
    locked: false,
    createdBy: currentUser,
    createdAt: now(),
  }

  bigScreenVersions = [version, ...bigScreenVersions]
  syncScreenRuntime(screen)
  persistVersions()
  persistScreens()

  return version
}

const setPublishedVersion = (screenId: string, versionId: string): void => {
  bigScreenVersions = bigScreenVersions.map((version) => {
    if (version.screenId !== screenId) {
      return version
    }

    return {
      ...version,
      status: version.id === versionId ? 'published' : 'history',
      locked: version.id === versionId ? true : version.locked,
    }
  })
}

const findVersion = (screenId: string, versionId: string): BigScreenVersion => {
  const version = bigScreenVersions.find((item) => item.screenId === screenId && item.id === versionId)

  if (!version) {
    throw new Error('版本不存在')
  }

  return version
}

const assertPassword = (password: string | undefined): string => {
  const value = password?.trim() ?? ''

  if (value.length < 6 || value.length > 32) {
    throw new Error('密码长度必须为 6-32 位')
  }

  return hashPassword(value)
}

export const listBigScreens = (filters: BigScreenListFilters): Promise<BigScreenListResult> => {
  bigScreens = bigScreens.map(syncScreenRuntime)
  const keyword = filters.keyword.trim().toLowerCase()
  const filteredItems = bigScreens.filter((screen) => {
    const matchesKeyword =
      !keyword ||
      screen.name.toLowerCase().includes(keyword) ||
      screen.description?.toLowerCase().includes(keyword) ||
      screen.createdBy.toLowerCase().includes(keyword) ||
      screen.updatedBy.toLowerCase().includes(keyword)
    const matchesStatus = filters.status === 'all' || screen.status === filters.status
    const matchesDevice = filters.deviceMode === 'all' || screen.deviceMode === filters.deviceMode

    return matchesKeyword && matchesStatus && matchesDevice
  })
  const stats = {
    total: bigScreens.length,
    draft: bigScreens.filter((screen) => screen.status === 'draft').length,
    published: bigScreens.filter((screen) => screen.status === 'published').length,
    offline: bigScreens.filter((screen) => screen.status === 'offline').length,
  }

  return resolveMock({
    items: sortScreens(filteredItems, filters.sortMode),
    stats,
  })
}

export const createBigScreen = async (payload: CreateBigScreenRequest): Promise<BigScreen> => {
  const name = payload.name.trim()

  if (!name) {
    throw new Error('大屏名称不能为空')
  }

  if (name.length > 50) {
    throw new Error('大屏名称不能超过 50 个字符')
  }

  const createdAt = now()
  const screenId = createId('screen')
  const deviceMode = payload.deviceMode ?? 'pc'
  const template = payload.templateId
    ? bigScreenTemplates.find((item) => item.id === payload.templateId)
    : undefined

  if (payload.templateId && !template) {
    throw new Error('模板不存在或无访问权限')
  }

  if (!template) {
    if ((payload.canvasWidth ?? 1) <= 0 || (payload.canvasHeight ?? 1) <= 0) {
      throw new Error('画布宽高必须大于 0')
    }

  }

  const draftSnapshot = template
    ? cloneSnapshotForScreen(template.snapshot, screenId, name)
    : buildDefaultSnapshot(screenId, name, deviceMode, {
        ratioType: payload.ratioType,
        canvasWidth: payload.canvasWidth,
        canvasHeight: payload.canvasHeight,
        layoutPreset: payload.layoutPreset,
      })
  const screen: BigScreen = {
    id: screenId,
    name,
    description: payload.description?.trim(),
    status: 'draft',
    deviceMode,
    homePageId: draftSnapshot.homePageId,
    pages: clone(draftSnapshot.pages),
    components: [],
    groups: [],
    globalVariables: [],
    assets: [],
    draftSnapshot,
    versionCount: 0,
    createdBy: currentUser,
    updatedBy: currentUser,
    createdAt,
    updatedAt: createdAt,
  }

  bigScreens = [screen, ...bigScreens]
  persistScreens()

  return resolveMock(screen)
}

export const getBigScreen = (screenId: string): Promise<BigScreen> => resolveMock(getMutableScreen(screenId))

export const saveBigScreen = async (screenId: string, payload: SaveBigScreenRequest): Promise<BigScreen> => {
  const screen = getMutableScreen(screenId)
  const snapshot = {
    ...clone(payload.draftSnapshot),
    name: payload.name.trim(),
    deviceMode: payload.deviceMode,
    homePageId: payload.homePageId,
    capturedAt: now(),
  }

  validateSnapshot(snapshot)

  screen.name = payload.name.trim()
  screen.description = payload.description?.trim()
  screen.deviceMode = payload.deviceMode
  screen.homePageId = payload.homePageId
  screen.draftSnapshot = snapshot
  screen.updatedBy = currentUser
  screen.updatedAt = now()
  syncScreenRuntime(screen)
  persistScreens()

  return resolveMock(screen)
}

export const deleteBigScreen = async (screenId: string): Promise<{ success: boolean, message: string }> => {
  getMutableScreen(screenId)
  bigScreens = bigScreens.filter((screen) => screen.id !== screenId)
  bigScreenVersions = bigScreenVersions.filter((version) => version.screenId !== screenId)
  persistScreens()
  persistVersions()

  return resolveMock({
    success: true,
    message: '数字大屏已删除',
  })
}

export const createBigScreenPreview = async (
  screenId: string,
  payload: CreatePreviewRequest,
): Promise<BigScreenPreviewSession> => {
  getMutableScreen(screenId)
  getHomePage(payload.snapshot)

  if (!payload.snapshot.pages.some((page) => page.id === payload.startPageId)) {
    throw new Error('预览起始页面不存在')
  }

  const createdAt = now()
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
  const session: BigScreenPreviewSession = {
    id: createId('preview'),
    screenId,
    startPageId: payload.startPageId,
    snapshot: clone(payload.snapshot),
    sourceType: payload.sourceType,
    sourceVersionId: payload.sourceVersionId,
    createdAt,
    expiresAt,
  }

  previewSessions = {
    ...previewSessions,
    [session.id]: session,
  }
  persistPreviews()

  return resolveMock(session)
}

export const getBigScreenPreview = (previewSessionId: string): Promise<BigScreenPreviewSession> => {
  const session = previewSessions[previewSessionId]

  if (!session) {
    throw new Error('预览会话不存在或已失效')
  }

  if (Date.parse(session.expiresAt) < Date.now()) {
    delete previewSessions[previewSessionId]
    persistPreviews()
    throw new Error('预览会话已过期，请重新预览')
  }

  return resolveMock(session)
}

export const listBigScreenVersions = (screenId: string): Promise<BigScreenVersion[]> => {
  getMutableScreen(screenId)

  return resolveMock(
    bigScreenVersions
      .filter((version) => version.screenId === screenId)
      .sort((left, right) => right.versionNo - left.versionNo),
  )
}

export const createBigScreenVersion = async (screenId: string, name?: string): Promise<BigScreenVersion> => {
  const screen = getMutableScreen(screenId)
  const version = createVersionRecord(screen, name)

  return resolveMock(version)
}

export const renameBigScreenVersion = async (
  screenId: string,
  versionId: string,
  name: string,
): Promise<BigScreenVersion> => {
  const version = findVersion(screenId, versionId)
  const nextName = name.trim()

  if (version.locked) {
    throw new Error('锁定版本不可改名')
  }

  if (!nextName) {
    throw new Error('版本名称不能为空')
  }

  if (nextName.length > 50) {
    throw new Error('版本名称不能超过 50 个字符')
  }

  version.name = nextName
  persistVersions()

  return resolveMock(version)
}

export const toggleBigScreenVersionLock = async (
  screenId: string,
  versionId: string,
): Promise<BigScreenVersion> => {
  const version = findVersion(screenId, versionId)
  version.locked = !version.locked
  persistVersions()

  return resolveMock(version)
}

export const deleteBigScreenVersion = async (
  screenId: string,
  versionId: string,
): Promise<{ success: boolean, message: string }> => {
  const version = findVersion(screenId, versionId)

  if (version.locked) {
    throw new Error('锁定版本不可删除')
  }

  if (version.status === 'published') {
    throw new Error('已发布版本不可直接删除，请先下线或发布其他版本')
  }

  bigScreenVersions = bigScreenVersions.filter((item) => item.id !== versionId)
  syncScreenRuntime(getMutableScreen(screenId))
  persistVersions()
  persistScreens()

  return resolveMock({
    success: true,
    message: '版本已删除',
  })
}

export const restoreBigScreenVersion = async (screenId: string, versionId: string): Promise<BigScreen> => {
  const screen = getMutableScreen(screenId)
  const version = findVersion(screenId, versionId)

  screen.draftSnapshot = {
    ...clone(version.snapshot),
    capturedAt: now(),
  }
  screen.name = screen.draftSnapshot.name
  screen.homePageId = screen.draftSnapshot.homePageId
  screen.deviceMode = screen.draftSnapshot.deviceMode
  screen.updatedAt = now()
  screen.updatedBy = currentUser
  syncScreenRuntime(screen)
  persistScreens()

  return resolveMock(screen)
}

export const publishBigScreen = async (
  screenId: string,
  payload: PublishBigScreenRequest,
): Promise<PublishBigScreenResponse> => {
  const screen = getMutableScreen(screenId)
  let publishVersion: BigScreenVersion

  if (payload.publishType === 'version') {
    if (!payload.versionId) {
      throw new Error('请选择要发布的版本')
    }

    publishVersion = findVersion(screenId, payload.versionId)
  } else {
    validateSnapshot(screen.draftSnapshot)
    publishVersion = createVersionRecord(screen)
  }

  const accessKey = screen.publishConfig?.accessKey ?? buildAccessKey(screen.id)
  const viewUrl = `/big-screens/published/${screen.id}?accessKey=${accessKey}`
  const secretKey = payload.accessMode === 'token'
    ? screen.publishConfig?.tokenSecretKey ?? buildSecretKey(screen.id)
    : undefined
  const passwordHash = payload.accessMode === 'password'
    ? assertPassword(payload.password)
    : undefined
  const publishedAt = now()

  screen.status = 'published'
  screen.currentPublishedVersionId = publishVersion.id
  screen.publishedSnapshot = clone(publishVersion.snapshot)
  screen.publishedAt = publishedAt
  screen.updatedAt = publishedAt
  screen.updatedBy = currentUser
  screen.publishConfig = {
    accessMode: payload.accessMode,
    accessKey,
    viewUrl,
    passwordHash,
    tokenSecretKey: secretKey,
    tokenSecretKeyMasked: maskSecretKey(secretKey),
    tokenExpireSeconds: payload.tokenExpireSeconds,
    publishedVersionId: publishVersion.id,
    publishStatus: 'published',
  }
  setPublishedVersion(screen.id, publishVersion.id)
  syncScreenRuntime(screen)
  persistVersions()
  persistScreens()

  return resolveMock({
    screenId: screen.id,
    status: 'published',
    viewUrl,
    accessKey,
    secretKey,
    publishedAt,
  })
}

export const offlineBigScreen = async (screenId: string): Promise<BigScreen> => {
  const screen = getMutableScreen(screenId)

  if (screen.status !== 'published') {
    throw new Error('只有已发布大屏可以下线')
  }

  screen.status = 'offline'
  if (screen.publishConfig) {
    screen.publishConfig = {
      ...screen.publishConfig,
      publishStatus: 'offline',
      offlineAt: now(),
    }
  }
  screen.updatedAt = now()
  screen.updatedBy = currentUser
  persistScreens()

  return resolveMock(screen)
}

export const createSharingToken = async (
  secretKey: string,
  expireTime: number,
): Promise<BigScreenSharingTokenResult> => {
  if (!secretKey.trim()) {
    throw new Error('secretKey 不能为空')
  }

  if (!Number.isInteger(expireTime) || expireTime <= 0 || expireTime > 86400) {
    throw new Error('expireTime 必须为 1-86400 秒的正整数')
  }

  const hasSecret = bigScreens.some((screen) => screen.publishConfig?.tokenSecretKey === secretKey)

  if (!hasSecret) {
    throw new Error('secretKey 不存在')
  }

  return resolveMock({
    code: 'ok',
    data: toBase64(JSON.stringify({
      secretKey,
      expiresAt: Date.now() + expireTime * 1000,
    })),
    msg: '成功',
  })
}

export const getPublishedBigScreen = async (
  screenId: string,
  options: {
    accessKey?: string
    password?: string
    accessToken?: string
  },
): Promise<BigScreenPublishedAccessResult> => {
  const screen = bigScreens.find((item) => item.id === screenId)

  if (!screen) {
    return resolveMock({ state: 'not_found', message: '大屏不存在或无访问权限' })
  }

  if (screen.status === 'offline') {
    return resolveMock({ state: 'offline', message: '当前大屏已下线' })
  }

  if (screen.status !== 'published' || !screen.publishedSnapshot || !screen.publishConfig) {
    return resolveMock({ state: 'not_found', message: '大屏不存在或无访问权限' })
  }

  if (screen.publishConfig.accessKey !== options.accessKey) {
    return resolveMock({ state: 'denied', message: '访问链接无效' })
  }

  if (screen.publishConfig.accessMode === 'password') {
    if (!options.password) {
      return resolveMock({ state: 'password_required', message: '当前大屏需要密码验证' })
    }

    if (hashPassword(options.password) !== screen.publishConfig.passwordHash) {
      return resolveMock({ state: 'denied', message: '密码错误，无法访问' })
    }
  }

  if (screen.publishConfig.accessMode === 'token') {
    if (!options.accessToken) {
      return resolveMock({ state: 'token_required', message: '当前大屏需要 Token 验证' })
    }

    try {
      const tokenPayload = JSON.parse(fromBase64(options.accessToken)) as {
        secretKey: string
        expiresAt: number
      }

      if (tokenPayload.expiresAt < Date.now()) {
        return resolveMock({ state: 'denied', message: 'Token 已过期，请重新获取' })
      }

      if (tokenPayload.secretKey !== screen.publishConfig.tokenSecretKey) {
        return resolveMock({ state: 'denied', message: 'Token 无效，无法访问' })
      }
    } catch {
      return resolveMock({ state: 'denied', message: 'Token 无效，无法访问' })
    }
  }

  return resolveMock({
    state: 'ok',
    screen,
    snapshot: screen.publishedSnapshot,
  })
}

export const listBigScreenTemplates = async (filters: {
  keyword?: string
  creator?: string
  sortMode?: 'updated_desc' | 'updated_asc' | 'name_asc'
} = {}): Promise<BigScreenTemplate[]> => {
  const keyword = filters.keyword?.trim().toLowerCase() ?? ''
  const creator = filters.creator?.trim().toLowerCase() ?? ''
  const filtered = bigScreenTemplates.filter((template) => {
    const matchesKeyword = !keyword || template.name.toLowerCase().includes(keyword) || template.description?.toLowerCase().includes(keyword)
    const matchesCreator = !creator || template.createdBy.toLowerCase().includes(creator)
    return matchesKeyword && matchesCreator
  })

  const sorted = [...filtered].sort((left, right) => {
    if (filters.sortMode === 'updated_asc') {
      return left.updatedAt.localeCompare(right.updatedAt)
    }

    if (filters.sortMode === 'name_asc') {
      return left.name.localeCompare(right.name, 'zh-Hans-CN')
    }

    return right.updatedAt.localeCompare(left.updatedAt)
  })

  return resolveMock(sorted)
}

export const createBigScreenTemplate = async (
  screenId: string,
  payload: CreateBigScreenTemplateRequest,
): Promise<BigScreenTemplate> => {
  const screen = getMutableScreen(screenId)
  const name = payload.name.trim()

  if (!name) {
    throw new Error('模板名称不能为空')
  }

  if (name.length > 50) {
    throw new Error('模板名称不能超过 50 个字符')
  }

  const template: BigScreenTemplate = {
    id: createId('template'),
    projectId: 'project-dataops-demo',
    name,
    description: payload.description?.trim(),
    coverUrl: payload.coverUrl || 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #14b8a6 100%)',
    scope: payload.scope,
    sourceScreenId: screen.id,
    sourceVersionId: payload.sourceVersionId,
    snapshot: buildTemplateSnapshot(payload.snapshot ?? screen.draftSnapshot, payload.isDesensitized),
    isDesensitized: payload.isDesensitized,
    createdBy: currentUser,
    updatedBy: currentUser,
    createdAt: now(),
    updatedAt: now(),
  }

  bigScreenTemplates = [template, ...bigScreenTemplates]
  persistTemplates()

  return resolveMock(template)
}

export const updateBigScreenTemplate = async (
  templateId: string,
  payload: UpdateBigScreenTemplateRequest,
): Promise<BigScreenTemplate> => {
  const template = bigScreenTemplates.find((item) => item.id === templateId)

  if (!template) {
    throw new Error('模板不存在或无访问权限')
  }

  const nextName = payload.name?.trim()
  if (nextName !== undefined && !nextName) {
    throw new Error('模板名称不能为空')
  }

  if (nextName && nextName.length > 50) {
    throw new Error('模板名称不能超过 50 个字符')
  }

  Object.assign(template, {
    ...payload,
    name: nextName ?? template.name,
    description: payload.description?.trim() ?? template.description,
    updatedBy: currentUser,
    updatedAt: now(),
  })
  persistTemplates()

  return resolveMock(template)
}

export const deleteBigScreenTemplate = async (templateId: string): Promise<{ success: boolean, message: string }> => {
  const template = bigScreenTemplates.find((item) => item.id === templateId)

  if (!template) {
    throw new Error('模板不存在或无访问权限')
  }

  bigScreenTemplates = bigScreenTemplates.filter((item) => item.id !== templateId)
  persistTemplates()

  return resolveMock({ success: true, message: '模板已删除' })
}

export const applyBigScreenTemplate = async (templateId: string, name: string, description?: string): Promise<BigScreen> =>
  createBigScreen({ name, description, templateId })

export const listBigScreenAssets = async (filters: {
  keyword?: string
  type?: BigScreenResourceAsset['type'] | 'all'
  category?: BigScreenResourceAsset['category'] | 'all'
} = {}): Promise<BigScreenResourceAsset[]> => {
  const keyword = filters.keyword?.trim().toLowerCase() ?? ''
  const filtered = bigScreenAssets.filter((asset) => {
    const matchesKeyword = !keyword || asset.name.toLowerCase().includes(keyword)
    const matchesType = !filters.type || filters.type === 'all' || asset.type === filters.type
    const matchesCategory = !filters.category || filters.category === 'all' || asset.category === filters.category
    return matchesKeyword && matchesType && matchesCategory
  })

  return resolveMock(filtered.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)))
}

export const uploadBigScreenAsset = async (payload: UploadBigScreenAssetRequest): Promise<BigScreenResourceAsset> => {
  const name = payload.name.trim()
  const extension = payload.extension.replace(/^\./, '').toLowerCase()
  const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif']
  const videoExts = ['mp4', 'webm']
  const fontExts = ['ttf', 'otf', 'woff', 'woff2']
  const allowedExts = payload.type === 'font' ? fontExts : payload.type === 'video' ? videoExts : imageExts

  if (!name) {
    throw new Error('资源名称不能为空')
  }

  if (!allowedExts.includes(extension)) {
    throw new Error('上传格式不支持')
  }

  if (payload.type === 'font' && !payload.licenseConfirmed) {
    throw new Error('上传字体前必须确认授权声明')
  }

  const warningMessage = payload.type === 'image' && payload.fileSize > 4 * 1024 * 1024
    ? '图片体积超过 4MB，可能影响大屏加载性能'
    : payload.type === 'video' && payload.fileSize > 10 * 1024 * 1024
      ? '视频体积超过 10MB，建议压缩后使用'
      : payload.type === 'font' && payload.fileSize > 10 * 1024 * 1024
        ? '字体文件较大，可能影响大屏加载性能'
        : undefined

  const asset: BigScreenResourceAsset = {
    id: createId('asset'),
    projectId: 'project-dataops-demo',
    name,
    type: payload.type,
    category: payload.category,
    source: payload.source ?? 'local-upload',
    fileUrl: payload.fileUrl,
    fileSize: payload.fileSize,
    mimeType: payload.mimeType,
    extension,
    usageCount: 0,
    licenseConfirmed: payload.licenseConfirmed,
    fontFamily: payload.fontFamily || (payload.type === 'font' ? name : undefined),
    warningMessage,
    createdBy: currentUser,
    createdAt: now(),
    updatedAt: now(),
  }

  bigScreenAssets = [asset, ...bigScreenAssets]
  persistAssets()

  return resolveMock(asset)
}

export const deleteBigScreenAsset = async (assetId: string): Promise<{ success: boolean, message: string }> => {
  const asset = bigScreenAssets.find((item) => item.id === assetId)

  if (!asset) {
    throw new Error('资源不存在或无访问权限')
  }

  bigScreenAssets = bigScreenAssets.filter((item) => item.id !== assetId)
  persistAssets()

  return resolveMock({
    success: true,
    message: asset.usageCount > 0 ? '资源已删除，引用该资源的组件将进入缺失资源状态' : '资源已删除',
  })
}

export const listBigScreenPresentationPlans = async (): Promise<BigScreenPresentationPlan[]> =>
  resolveMock([...presentationPlans].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)))

const normalizePresentationItems = (items: BigScreenPresentationPlan['items']): BigScreenPresentationPlan['items'] => {
  if (!items.length) {
    throw new Error('演播方案至少需要添加一个大屏')
  }

  return items
    .map((item, index) => {
      const screen = bigScreens.find((screenItem) => screenItem.id === item.screenId)

      if (!screen || screen.status !== 'published') {
        throw new Error(`「${item.displayName || item.screenId}」未发布，不能加入演播方案`)
      }

      if (!Number.isInteger(item.durationSeconds) || item.durationSeconds < 5) {
        throw new Error('单屏播放时长不能小于 5 秒')
      }

      if (item.durationSeconds > 3600) {
        throw new Error('单屏播放时长不能大于 3600 秒')
      }

      return {
        ...item,
        id: item.id || createId('presentation-item'),
        displayName: item.displayName || screen.name,
        publishedVersionId: screen.currentPublishedVersionId,
        order: index + 1,
      }
    })
}

export const saveBigScreenPresentationPlan = async (
  planId: string | undefined,
  payload: SaveBigScreenPresentationPlanRequest,
): Promise<BigScreenPresentationPlan> => {
  const name = payload.name.trim()

  if (!name) {
    throw new Error('演播方案名称不能为空')
  }

  const items = normalizePresentationItems(payload.items)

  if (planId) {
    const plan = presentationPlans.find((item) => item.id === planId)
    if (!plan) {
      throw new Error('演播方案不存在或无访问权限')
    }

    Object.assign(plan, {
      name,
      items,
      loopMode: payload.loopMode,
      status: payload.status,
      updatedAt: now(),
    })
    persistPresentationPlans()
    return resolveMock(plan)
  }

  const plan: BigScreenPresentationPlan = {
    id: createId('presentation'),
    projectId: 'project-dataops-demo',
    name,
    items,
    loopMode: payload.loopMode,
    status: payload.status,
    createdBy: currentUser,
    createdAt: now(),
    updatedAt: now(),
  }

  presentationPlans = [plan, ...presentationPlans]
  persistPresentationPlans()

  return resolveMock(plan)
}

export const deleteBigScreenPresentationPlan = async (planId: string): Promise<{ success: boolean, message: string }> => {
  const plan = presentationPlans.find((item) => item.id === planId)

  if (!plan) {
    throw new Error('演播方案不存在或无访问权限')
  }

  presentationPlans = presentationPlans.filter((item) => item.id !== planId)
  persistPresentationPlans()

  return resolveMock({ success: true, message: '演播方案已删除' })
}

export const getBigScreenPresentationRuntime = async (planId: string): Promise<BigScreenPresentationRuntime> => {
  const plan = presentationPlans.find((item) => item.id === planId)

  if (!plan) {
    throw new Error('演播方案不存在或无访问权限')
  }

  const items = plan.items
    .sort((left, right) => left.order - right.order)
    .map((item) => {
      const screen = bigScreens.find((screenItem) => screenItem.id === item.screenId)

      if (!screen) {
        return { ...item, state: 'missing' as const, message: '大屏不存在或无访问权限' }
      }

      if (screen.status === 'offline') {
        return { ...item, state: 'offline' as const, message: '当前大屏已下线' }
      }

      if (screen.status !== 'published' || !screen.publishedSnapshot || !screen.publishConfig) {
        return { ...item, state: 'denied' as const, message: '请先发布大屏' }
      }

      return {
        ...item,
        state: 'ok' as const,
        snapshot: screen.publishedSnapshot,
        accessKey: screen.publishConfig.accessKey,
      }
    })

  return resolveMock({ plan, items })
}

const hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
  const normalized = hex.replace('#', '').trim()
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    return null
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

const getRelativeLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return 0
  }

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((value) => {
    const x = value / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

const createIssue = (
  snapshot: BigScreenSnapshot,
  issue: Omit<BigScreenDevIssue, 'id' | 'screenId' | 'createdAt' | 'quickActions'> & { quickActions?: BigScreenDevIssue['quickActions'] },
): BigScreenDevIssue => ({
  id: createId('dev-issue'),
  screenId: snapshot.screenId,
  createdAt: now(),
  quickActions: issue.quickActions ?? [],
  ...issue,
})

export const runBigScreenDevToolsCheck = async (
  screenId: string,
  snapshot?: BigScreenSnapshot,
): Promise<BigScreenDevToolsCheckResult> => {
  const screen = getMutableScreen(screenId)
  const targetSnapshot = snapshot ?? screen.draftSnapshot
  const issues: BigScreenDevIssue[] = []

  targetSnapshot.components.forEach((component) => {
    if (component.dataBinding?.lastQueryState?.status === 'error') {
      issues.push(createIssue(targetSnapshot, {
        pageId: component.pageId,
        componentId: component.id,
        module: 'query',
        ruleCode: 'query-failed',
        severity: 'error',
        title: '查询失败',
        description: `组件「${component.name}」最近一次查询失败：${component.dataBinding.lastQueryState.errorMessage ?? '请检查查询配置'}`,
        solution: '定位到组件，打开数据配置面板后重试查询。',
        quickActions: [
          { id: createId('action'), label: '定位组件', actionType: 'locate-component' },
          { id: createId('action'), label: '打开数据面板', actionType: 'open-data-panel' },
          { id: createId('action'), label: '重试查询', actionType: 'retry-query' },
        ],
      }))
    }

    if (component.dataBinding?.updateMode === 'auto' && Number(component.dataBinding.refreshIntervalSeconds ?? 60) < 5) {
      issues.push(createIssue(targetSnapshot, {
        pageId: component.pageId,
        componentId: component.id,
        module: 'query',
        ruleCode: 'refresh-interval-too-small',
        severity: 'warning',
        title: '查询间隔过小',
        description: `组件「${component.name}」自动刷新间隔低于 5 秒，可能造成服务端压力。`,
        solution: '将自动刷新间隔调整到 5 秒或更长。',
        quickActions: [
          { id: createId('action'), label: '调整为 5 秒', actionType: 'increase-refresh-interval', payload: { seconds: 5 } },
        ],
      }))
    }

    if (chartComponentTypes.has(component.type)) {
      getBigScreenChartDiagnostics(component).forEach((diagnostic) => {
        issues.push(createIssue(targetSnapshot, {
          pageId: component.pageId,
          componentId: component.id,
          module: 'query',
          ruleCode: `chart-${diagnostic.code}-${diagnostic.slot ?? 'general'}`,
          severity: diagnostic.severity,
          title: diagnostic.code === 'missing-field' ? '图表字段缺失' : diagnostic.code === 'empty-data' ? '图表暂无数据' : '图表数据异常',
          description: `组件「${component.name}」${diagnostic.message}。`,
          solution: diagnostic.code === 'missing-field'
            ? '补齐字段映射，或重新绑定维度、指标和系列字段。'
            : '检查数据源返回结果、字段类型和筛选条件。',
          quickActions: [
            { id: createId('action'), label: '定位组件', actionType: 'locate-component' },
            { id: createId('action'), label: '打开数据面板', actionType: 'open-data-panel' },
            ...(diagnostic.code === 'missing-field'
              ? [{ id: createId('action'), label: '补默认字段', actionType: 'repair-chart-fields' as const }]
              : []),
          ],
        }))
      })
    }

    if (['image', 'video', 'videoStream', 'iframe'].includes(component.type)) {
      const source = String(
        component.style.imageUrl
          ?? component.style.videoUrl
          ?? component.style.streamUrl
          ?? component.style.url
          ?? '',
      ).trim()
      if (!source) {
        issues.push(createIssue(targetSnapshot, {
          pageId: component.pageId,
          componentId: component.id,
          module: 'asset',
          ruleCode: 'media-source-missing',
          severity: 'warning',
          title: '媒体资源未配置',
          description: `组件「${component.name}」缺少可展示的资源地址。`,
          solution: '补充图片、视频、视频流或网页地址，或删除该占位组件。',
          quickActions: [{ id: createId('action'), label: '定位组件', actionType: 'locate-component' }],
        }))
      }
    }

    if (['title', 'singleText', 'multiText'].includes(component.type)) {
      const text = String(component.style.text ?? component.name)
      const fontSize = Number(component.style.fontSize ?? 20)
      const estimatedWidth = text.length * fontSize * 0.58
      const lines = component.type === 'multiText' ? Math.max(1, Math.floor(component.layout.height / Math.max(1, fontSize * 1.4))) : 1
      if (estimatedWidth > component.layout.width * lines) {
        issues.push(createIssue(targetSnapshot, {
          pageId: component.pageId,
          componentId: component.id,
          module: 'style',
          ruleCode: 'text-overflow-risk',
          severity: 'warning',
          title: '文字可能溢出',
          description: `组件「${component.name}」文字长度可能超过组件宽度。`,
          solution: '放大组件、降低字号，或启用滚动/换行配置。',
          quickActions: [
            { id: createId('action'), label: '定位组件', actionType: 'locate-component' },
            { id: createId('action'), label: '自动整理', actionType: 'auto-align' },
          ],
        }))
      }
    }
  })

  if (targetSnapshot.pages.length > 10) {
    issues.push(createIssue(targetSnapshot, {
      module: 'screen',
      ruleCode: 'too-many-pages',
      severity: 'warning',
      title: '页面数量过多',
      description: '当前页面数量超过 10 页，可能影响加载和维护效率。',
      solution: '合并低频页面，或将局部内容放入轮播器、标签页中。',
      quickActions: [{ id: createId('action'), label: '查看页面列表', actionType: 'locate-component' }],
    }))
  }

  const threeDCount = targetSnapshot.components.filter((component) => component.type === 'map3d' || component.type === 'earth3d').length
  if (threeDCount > 10) {
    issues.push(createIssue(targetSnapshot, {
      module: 'screen',
      ruleCode: 'too-many-3d-components',
      severity: 'warning',
      title: '3D 组件过多',
      description: '当前 3D 组件超过 10 个，可能影响渲染性能。',
      solution: '优先保留主视觉 3D 组件，其他区域使用图表或截图替代。',
    }))
  }

  targetSnapshot.assets.forEach((asset) => {
    if (asset.type === 'image' && asset.size > 4 * 1024 * 1024) {
      issues.push(createIssue(targetSnapshot, {
        module: 'asset',
        ruleCode: 'large-image',
        severity: 'warning',
        title: '图片资源过大',
        description: `资源「${asset.name}」超过 4MB，可能拖慢发布页加载。`,
        solution: '压缩图片或替换为 webp 格式。',
        quickActions: [{ id: createId('action'), label: '标记压缩', actionType: 'compress-asset' }],
      }))
    }

    if (asset.type === 'video' && asset.size > 10 * 1024 * 1024) {
      issues.push(createIssue(targetSnapshot, {
        module: 'asset',
        ruleCode: 'large-video',
        severity: 'warning',
        title: '视频资源过大',
        description: `资源「${asset.name}」超过 10MB，建议压缩后用于大屏。`,
        solution: '压缩视频或减少自动播放视频数量。',
      }))
    }
  })

  targetSnapshot.pages.forEach((page) => {
    const pageComponents = targetSnapshot.components.filter((component) => component.pageId === page.id && component.visible)
    const totalArea = pageComponents.reduce((sum, component) => sum + component.layout.width * component.layout.height, 0)
    const pageArea = Math.max(1, page.width * page.height)

    if (page.background.color && getRelativeLuminance(page.background.color) > 0.6) {
      issues.push(createIssue(targetSnapshot, {
        pageId: page.id,
        module: 'style',
        ruleCode: 'background-too-bright',
        severity: 'warning',
        title: '背景亮度较高',
        description: `页面「${page.name}」背景亮度较高，长时间观看可能刺眼。`,
        solution: '建议使用暗色背景，并把亮色用于关键指标、告警或选中态。',
        quickActions: [{ id: createId('action'), label: '忽略此问题', actionType: 'ignore' }],
      }))
    }

    if (totalArea / pageArea > 0.75) {
      issues.push(createIssue(targetSnapshot, {
        pageId: page.id,
        module: 'layout',
        ruleCode: 'density-too-high',
        severity: 'warning',
        title: '页面信息密度较高',
        description: `页面「${page.name}」组件总面积超过画布 75%。`,
        solution: '减少组件数量，或使用轮播器、标签页承载低频信息。',
      }))
    }

    pageComponents.forEach((component) => {
      const outOfBounds = component.layout.x < 0
        || component.layout.y < 0
        || component.layout.x + component.layout.width > page.width
        || component.layout.y + component.layout.height > page.height
      if (outOfBounds) {
        issues.push(createIssue(targetSnapshot, {
          pageId: page.id,
          componentId: component.id,
          module: 'layout',
          ruleCode: 'component-out-of-bounds',
          severity: 'error',
          title: '组件超出画布',
          description: `组件「${component.name}」有部分区域超出页面「${page.name}」。`,
          solution: '使用自动整理，或手动调整组件坐标和尺寸。',
          quickActions: [
            { id: createId('action'), label: '定位组件', actionType: 'locate-component' },
            { id: createId('action'), label: '自动整理', actionType: 'auto-align' },
          ],
        }))
      }

      if (component.layout.width < 80 || component.layout.height < 48) {
        issues.push(createIssue(targetSnapshot, {
          pageId: page.id,
          componentId: component.id,
          module: 'layout',
          ruleCode: 'component-too-small',
          severity: 'warning',
          title: '组件尺寸过小',
          description: `组件「${component.name}」尺寸过小，图表或文字可能无法正常显示。`,
          solution: '放大组件，或使用自动整理重新分配空间。',
          quickActions: [
            { id: createId('action'), label: '定位组件', actionType: 'locate-component' },
            { id: createId('action'), label: '自动整理', actionType: 'auto-align' },
          ],
        }))
      }

      if (component.layout.x < 20 || component.layout.y < 20) {
        issues.push(createIssue(targetSnapshot, {
          pageId: page.id,
          componentId: component.id,
          module: 'layout',
          ruleCode: 'edge-too-close',
          severity: 'warning',
          title: '组件贴边',
          description: `组件「${component.name}」离画布边缘过近。`,
          solution: '核心组件建议与画布边缘保持至少 20px 距离。',
          quickActions: [{ id: createId('action'), label: '定位组件', actionType: 'locate-component' }],
        }))
      }
    })

    const overlapCandidates = pageComponents.filter((component) =>
      !['rectangle', 'circle', 'hotspot'].includes(component.type)
      && !component.marker?.includes('layout-guide'),
    )

    overlapCandidates.forEach((component, index) => {
      overlapCandidates.slice(index + 1).forEach((next) => {
        const separated = component.layout.x + component.layout.width <= next.layout.x
          || next.layout.x + next.layout.width <= component.layout.x
          || component.layout.y + component.layout.height <= next.layout.y
          || next.layout.y + next.layout.height <= component.layout.y

        if (!separated) {
          issues.push(createIssue(targetSnapshot, {
            pageId: page.id,
            componentId: component.id,
            module: 'layout',
            ruleCode: 'component-overlap',
            severity: 'warning',
            title: '组件存在重叠',
            description: `组件「${component.name}」与「${next.name}」存在重叠。`,
            solution: '使用自动整理或对齐分布工具，减少遮挡。',
            quickActions: [
              { id: createId('action'), label: '定位组件', actionType: 'locate-component' },
              { id: createId('action'), label: '自动整理', actionType: 'auto-align' },
            ],
          }))
        }
      })
    })

    const fonts = new Set(
      pageComponents
        .map((component) => String(component.style.fontFamily ?? '').trim())
        .filter(Boolean),
    )
    if (fonts.size > 3) {
      issues.push(createIssue(targetSnapshot, {
        pageId: page.id,
        module: 'style',
        ruleCode: 'too-many-fonts',
        severity: 'warning',
        title: '字体数量过多',
        description: `页面「${page.name}」使用了 ${fonts.size} 种字体，可能导致视觉混乱。`,
        solution: '统一标题、正文和数字字体，建议不超过 3 种。',
        quickActions: [{ id: createId('action'), label: '统一字体', actionType: 'unify-font' }],
      }))
    }
  })

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    issues.push(createIssue(targetSnapshot, {
      module: 'terminal',
      ruleCode: 'network-offline',
      severity: 'error',
      title: '网络中断',
      description: '当前网络中断，无法稳定保存、发布或预览。',
      solution: '恢复网络连接后再执行保存和发布。',
    }))
  }

  const sortedIssues = issues.sort((left, right) => {
    const severityOrder = { error: 0, warning: 1, resolved: 2 }
    return severityOrder[left.severity] - severityOrder[right.severity]
  })
  const status = sortedIssues.some((issue) => issue.severity === 'error')
    ? 'red'
    : sortedIssues.some((issue) => issue.severity === 'warning')
      ? 'yellow'
      : 'green'

  devIssues = [
    ...sortedIssues,
    ...devIssues
      .filter((issue) => issue.screenId === screenId)
      .filter((issue) => !sortedIssues.some((nextIssue) => nextIssue.ruleCode === issue.ruleCode && nextIssue.componentId === issue.componentId))
      .map((issue) => ({ ...issue, severity: 'resolved' as const, resolvedAt: issue.resolvedAt ?? now() })),
  ]
  persistDevIssues()

  return resolveMock({ status, checkedAt: now(), issues: devIssues.filter((issue) => issue.screenId === screenId) })
}

export const createBigScreenSmartVJob = async (
  screenId: string,
  payload: CreateBigScreenSmartVJobRequest,
): Promise<BigScreenSmartVJob> => {
  getMutableScreen(screenId)

  const progress = getSmartVSteps(payload.type).map((stepName, index) => ({
    stepName,
    status: index === 0 ? 'running' as const : 'pending' as const,
    message: index === 0 ? '任务已进入后端队列，开始执行' : undefined,
  }))
  const output = buildSmartVOutput(payload.type, payload.snapshot, payload.input)
  const job: BigScreenSmartVJob = {
    id: createId('smart-v-job'),
    screenId,
    type: payload.type,
    status: 'running',
    input: payload.input,
    output,
    progress,
    createdAt: now(),
    updatedAt: now(),
  }

  smartVJobs = [job, ...smartVJobs]
  persistSmartVJobs()

  return resolveMock(job)
}

export const getBigScreenSmartVJob = async (jobId: string): Promise<BigScreenSmartVJob> => {
  const job = smartVJobs.find((item) => item.id === jobId)

  if (!job) {
    throw new Error('智能小助手任务不存在')
  }

  if (job.status === 'running') {
    const runningIndex = Math.max(0, job.progress.findIndex((step) => step.status === 'running'))
    const nextProgress = job.progress.map((step, index) => {
      if (index < runningIndex) {
        return { ...step, status: 'success' as const, message: step.message ?? '已完成' }
      }

      if (index === runningIndex) {
        return { ...step, status: 'success' as const, message: '已完成' }
      }

      if (index === runningIndex + 1) {
        return { ...step, status: 'running' as const, message: '正在处理' }
      }

      return step
    })
    const finished = runningIndex >= job.progress.length - 1

    Object.assign(job, {
      progress: nextProgress,
      status: finished ? 'success' : 'running',
      updatedAt: now(),
    })
    persistSmartVJobs()
  }

  return resolveMock(job)
}

export const cancelBigScreenSmartVJob = async (jobId: string): Promise<BigScreenSmartVJob> => {
  const job = smartVJobs.find((item) => item.id === jobId)

  if (!job) {
    throw new Error('智能小助手任务不存在')
  }

  if (job.status === 'running' || job.status === 'pending') {
    job.status = 'cancelled'
    job.updatedAt = now()
    persistSmartVJobs()
  }

  return resolveMock(job)
}

export const bigScreenService = {
  listBigScreens,
  createBigScreen,
  getBigScreen,
  saveBigScreen,
  deleteBigScreen,
  createBigScreenPreview,
  getBigScreenPreview,
  listBigScreenVersions,
  createBigScreenVersion,
  renameBigScreenVersion,
  toggleBigScreenVersionLock,
  deleteBigScreenVersion,
  restoreBigScreenVersion,
  publishBigScreen,
  offlineBigScreen,
  createSharingToken,
  getPublishedBigScreen,
  listBigScreenTemplates,
  createBigScreenTemplate,
  updateBigScreenTemplate,
  deleteBigScreenTemplate,
  applyBigScreenTemplate,
  listBigScreenAssets,
  uploadBigScreenAsset,
  deleteBigScreenAsset,
  listBigScreenPresentationPlans,
  saveBigScreenPresentationPlan,
  deleteBigScreenPresentationPlan,
  getBigScreenPresentationRuntime,
  runBigScreenDevToolsCheck,
  createBigScreenSmartVJob,
  getBigScreenSmartVJob,
  cancelBigScreenSmartVJob,
}
