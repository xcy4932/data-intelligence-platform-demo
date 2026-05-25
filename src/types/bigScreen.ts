import type { EntityId, ISODateTimeString } from './common'

export type BigScreenStatus = 'draft' | 'published' | 'offline'

export type BigScreenDeviceMode = 'pc' | 'mobile'

export type BigScreenRatioType = '16:9' | '32:9' | 'custom'

export type BigScreenLayoutPresetType =
  | 'blank'
  | 'sparse-center'
  | 'sparse-left-right'
  | 'dense-center'
  | 'dense-side'
  | 'no-main-visual'
  | 'wide-32-9-three-column'
  | 'wide-32-9-center-focus'

export type BigScreenPermission =
  | 'bigscreen:create'
  | 'bigscreen:view'
  | 'bigscreen:edit'
  | 'bigscreen:delete'
  | 'bigscreen:preview'
  | 'bigscreen:publish'
  | 'bigscreen:offline'
  | 'bigscreen:version:create'
  | 'bigscreen:version:restore'
  | 'bigscreen:template:create'
  | 'bigscreen:customComponent:manage'

export type BigScreenComponentType =
  | 'title'
  | 'singleText'
  | 'multiText'
  | 'rectangle'
  | 'circle'
  | 'image'
  | 'video'
  | 'iframe'
  | 'hotspot'
  | 'videoStream'
  | 'datetime'
  | 'date'
  | 'time'
  | 'weekday'
  | 'repeater'
  | 'carousel'
  | 'tabs'
  | 'select'
  | 'multiSelect'
  | 'treeSelect'
  | 'treeMultiSelect'
  | 'datePicker'
  | 'metricCard'
  | 'flipNumber'
  | 'rankingList'
  | 'table'
  | 'groupedColumn'
  | 'stackedColumn'
  | 'percentColumn'
  | 'groupedBar'
  | 'stackedBar'
  | 'percentBar'
  | 'bidirectionalBar'
  | 'line'
  | 'area'
  | 'percentArea'
  | 'dualAxis'
  | 'pie'
  | 'donut'
  | 'rose'
  | 'singleValueDonut'
  | 'wordCloud'
  | 'scatter'
  | 'circleView'
  | 'funnel'
  | 'radar'
  | 'sankey'
  | 'gauge'
  | 'waterWave'
  | 'map3d'
  | 'earth3d'
  | 'custom'

export type BigScreenThreeDComponentType = 'map3d' | 'earth3d'

export type BigScreenThreeDLayerType =
  | 'bubble'
  | 'iconScatter'
  | 'bar3d'
  | 'infoLabel'
  | 'flyLine'
  | 'trajectoryLine'
  | 'adminHeat'
  | 'classicHeat'
  | 'hexHeat'
  | 'gridHeat'
  | 'surfaceDecoration'
  | 'risingChar'
  | 'particle'
  | 'isochrone'

export interface BigScreenMap3DContainerConfig {
  mapType: 'china' | 'world' | 'custom'
  background: {
    enabled: boolean
    color: string
  }
  gesture: {
    enabled: boolean
    zoomable: boolean
    pannable: boolean
    pitchable: boolean
    rotateable: boolean
  }
  boundary: {
    sourceType: 'system' | 'custom'
    systemRegion: string
    customGeoJsonAssetId?: string | null
  }
  adminMap: {
    enabled: boolean
    extrusionHeight: number
    outerBorder: Record<string, unknown>
    innerBorder: Record<string, unknown>
    outerGlow: Record<string, unknown>
    outerFlowLine: Record<string, unknown>
    fillStyle: Record<string, unknown>
    labelStyle: Record<string, unknown>
  }
  southChinaSeaInset: {
    enabled: boolean
    position: 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom'
    scale: number
    marginX: number
    marginY: number
    seaColor: string
    landColor: string
    borderStyle: Record<string, unknown>
    frameStyle: Record<string, unknown>
    labelStyle: Record<string, unknown>
  }
  amapBaseMap: {
    enabled: boolean
    styleType: 'preset' | 'custom'
    presetStyle: 'phantom-black' | 'indigo-blue' | 'polar-night-blue' | 'gray' | 'moonlight-silver' | 'dark-blue'
    customStyleId: string
    key: string
    securityJsCode: string
    contentControl: Record<string, unknown>
    filter: Record<string, unknown>
  }
  camera: {
    center: [number, number]
    zoom: number
    pitch: number
    bearing: number
  }
  drill: {
    enabled: boolean
    currentRegion: string
    history: string[]
  }
  customRegions: Array<Record<string, unknown>>
}

export interface BigScreenEarth3DContainerConfig {
  view: {
    longitude: number
    latitude: number
    zoom: number
    minZoom: number
    maxZoom: number
  }
  gesture: {
    enabled: boolean
    zoomable: boolean
    rotateable: boolean
  }
  adminMap: {
    outerBorder: Record<string, unknown>
    innerBorder: Record<string, unknown>
  }
  material: {
    metalness: number
    roughness: number
    diffuseTextureAssetId?: string | null
    normalTextureAssetId?: string | null
    normalScale: number
  }
  labelStyle: Record<string, unknown>
  background: {
    enabled: boolean
    color: string
  }
  autoRotate: {
    enabled: boolean
    speed: number
    pauseOnHover: boolean
  }
  glow: {
    enabled: boolean
    range: number
    intensity: number
    color: string
  }
  cloud: {
    enabled: boolean
    scale: number
    opacity: number
    speed: number
  }
  light: {
    ambientColor: string
    ambientIntensity: number
    directionalColor: string
    directionalIntensity: number
    directionalPosition: [number, number, number]
  }
}

export interface BigScreenThreeDLayer {
  id: EntityId
  parentComponentId: EntityId
  type: BigScreenThreeDLayerType
  name: string
  visible: boolean
  locked: boolean
  zIndex: number
  minZoom?: number
  maxZoom?: number
  dataBinding?: BigScreenDataBindingConfig
  styleConfig: Record<string, unknown>
  animationConfig?: Record<string, unknown>
  interactions?: BigScreenInteractionEvent[]
}

export type BigScreenAnimationType =
  | 'none'
  | 'fade'
  | 'drawer'
  | 'scale'
  | 'scroll'
  | 'fly'
  | 'float'

export type BigScreenAnimationEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'

export type BigScreenInteractionTrigger =
  | 'click'
  | 'double-click'
  | 'change'
  | 'mouseenter'
  | 'mouseleave'
  | 'page-load'
  | 'data-loaded'
  | 'custom'

export type BigScreenInteractionActionType =
  | 'open-link'
  | 'switch-page'
  | 'set-element-property'
  | 'switch-panel-state'
  | 'change-carousel-state'
  | 'gis-drill'
  | 'set-filter'
  | 'wait'
  | 'emit-event'
  | 'trigger-3d-model-event'
  | 'set-variable'
  | 'refresh-data'
  | 'refresh-all-visuals'
  | 'trigger-ue-action'

export interface BigScreenPageBackground {
  type: 'color' | 'image' | 'color-image'
  color?: string
  imageUrl?: string
  imageFit?: 'cover' | 'contain' | 'stretch' | 'repeat'
  opacity?: number
}

export interface BigScreenPage {
  id: EntityId
  screenId: EntityId
  name: string
  width: number
  height: number
  background: BigScreenPageBackground
  componentIds: EntityId[]
  interactionEvents: BigScreenInteractionEvent[]
  sortIndex: number
  isHomePage: boolean
}

export interface BigScreenComponentLayout {
  x: number
  y: number
  width: number
  height: number
  rotate: number
  opacity: number
  lockAspectRatio: boolean
  overflowHidden: boolean
}

export type BigScreenAutoLayoutMode = 'page' | 'selection' | 'mobile'

export interface BigScreenAutoLayoutOptions {
  pageId: EntityId
  mode: BigScreenAutoLayoutMode
  selectedComponentIds?: EntityId[]
  gridSize?: number
  margin?: number
  gap?: number
}

export interface BigScreenLayoutIssue {
  id: EntityId
  pageId?: EntityId
  componentId?: EntityId
  severity: 'info' | 'warning' | 'error'
  code:
    | 'component-locked'
    | 'component-moved'
    | 'component-out-of-bounds'
    | 'component-overlap'
    | 'component-too-small'
    | 'layout-density-high'
    | 'no-components'
  message: string
}

export interface BigScreenAutoLayoutResult {
  snapshot: BigScreenSnapshot
  movedComponentIds: EntityId[]
  skippedComponentIds: EntityId[]
  issues: BigScreenLayoutIssue[]
}

export interface BigScreenFieldMapping {
  slot: string
  fieldName: string
  fieldType: 'dimension' | 'measure' | 'date'
  aggregation?: 'count' | 'sum' | 'avg' | 'max' | 'min'
}

export interface BigScreenSortConfig {
  fieldName: string
  order: 'asc' | 'desc' | 'custom'
  customOrder?: string[]
}

export interface BigScreenFilterConfig {
  fieldName: string
  operator:
    | 'eq'
    | 'ne'
    | 'neq'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'like'
    | 'not_contains'
    | 'notContains'
    | 'notLike'
    | 'in'
    | 'not_in'
    | 'notIn'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'between'
    | 'betweenDate'
    | 'betweenDatetime'
    | 'recent'
    | 'recentWithData'
    | 'timeExpression'
  value: unknown
}

export interface BigScreenTopNConfig {
  enabled: boolean
  mode: 'all' | 'top' | 'bottom'
  count: number
  measureField?: string
}

export interface BigScreenTableColumn {
  id: string
  name: string
  displayName: string
  dataType: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'object'
  role: 'dimension' | 'measure' | 'unknown'
  sourceFieldPath?: string
}

export interface BigScreenTableRow {
  id: string
  values: Record<string, unknown>
}

export interface BigScreenTableSchema {
  columns: BigScreenTableColumn[]
  rows: BigScreenTableRow[]
}

export interface BigScreenReferenceLineConfig {
  id: string
  name: string
  fieldName: string
  value: number | 'avg' | 'max' | 'min'
  color: string
  visible: boolean
}

export interface BigScreenExtraFieldConfig {
  id: string
  name: string
  expression: string
  dataType: BigScreenTableColumn['dataType']
  enabled: boolean
}

export interface BigScreenGlobalFilterBinding {
  id: string
  sourceComponentId: EntityId
  sourceFieldName: string
  targetFieldName: string
  enabled: boolean
}

export interface BigScreenQueryState {
  status: 'idle' | 'loading' | 'success' | 'error'
  startedAt?: ISODateTimeString
  finishedAt?: ISODateTimeString
  errorMessage?: string
  rawDataPreview?: unknown
  parsedTable?: BigScreenTableSchema
}

export interface BigScreenDataBindingConfig {
  sourceType: 'static' | 'dataset' | 'api' | 'javascript' | 'mysql' | 'feishu-sheet' | 'feishu-bitable'
  sourceId?: string
  sourceConfig?: Record<string, unknown>
  fields: BigScreenFieldMapping[]
  fieldSlots?: Record<string, string[]>
  updateMode: 'auto' | 'once' | 'manual'
  refreshIntervalSeconds?: number
  sortRules?: BigScreenSortConfig[]
  filterRules?: BigScreenFilterConfig[]
  topN?: BigScreenTopNConfig
  globalFilterBindings?: BigScreenGlobalFilterBinding[]
  referenceLines?: BigScreenReferenceLineConfig[]
  extraFields?: BigScreenExtraFieldConfig[]
  lastQueryState?: BigScreenQueryState
  staticRows?: Array<Record<string, unknown>>
}

export interface BigScreenSingleAnimationConfig {
  enabled: boolean
  type: BigScreenAnimationType
  durationMs: number
  startTimeMs: number
  easing: BigScreenAnimationEasing
}

export interface BigScreenAnimationConfig {
  enter: BigScreenSingleAnimationConfig
  exit: BigScreenSingleAnimationConfig
}

export interface BigScreenInteractionAction {
  id: EntityId
  type: BigScreenInteractionActionType
  targetId?: EntityId
  payload: Record<string, unknown>
}

export type BigScreenInteractionConditionSource = 'event' | 'variable' | 'component' | 'constant'

export type BigScreenInteractionConditionOperator =
  | 'always'
  | 'eq'
  | 'ne'
  | 'neq'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'like'
  | 'not_contains'
  | 'notContains'
  | 'notLike'
  | 'in'
  | 'not_in'
  | 'notIn'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'empty'
  | 'not_empty'

export interface BigScreenInteractionCondition {
  id: EntityId
  source: BigScreenInteractionConditionSource
  targetId?: EntityId
  key?: string
  operator: BigScreenInteractionConditionOperator
  value?: unknown
  enabled: boolean
}

export interface BigScreenInteractionEvent {
  id: EntityId
  name: string
  trigger: BigScreenInteractionTrigger
  enabled: boolean
  conditions?: BigScreenInteractionCondition[]
  actions: BigScreenInteractionAction[]
}

export interface BigScreenComponent {
  id: EntityId
  pageId: EntityId
  screenId: EntityId
  type: BigScreenComponentType
  name: string
  parentGroupId?: EntityId
  layout: BigScreenComponentLayout
  style: Record<string, unknown>
  dataBinding?: BigScreenDataBindingConfig
  interactions: BigScreenInteractionEvent[]
  animations: BigScreenAnimationConfig
  visible: boolean
  locked: boolean
  zIndex: number
  marker: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface BigScreenGroup {
  id: EntityId
  screenId: EntityId
  pageId: EntityId
  name: string
  componentIds: EntityId[]
  visible: boolean
  locked: boolean
  zIndex: number
}

export interface BigScreenVariable {
  id: EntityId
  name: string
  key: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
  value: unknown
  description?: string
}

export interface BigScreenAsset {
  id: EntityId
  name: string
  type: 'image' | 'video' | 'font' | 'geojson' | 'custom-component' | 'other'
  url: string
  size: number
  createdAt: ISODateTimeString
}

export interface BigScreenSnapshot {
  screenId: EntityId
  name: string
  deviceMode: BigScreenDeviceMode
  ratioType?: BigScreenRatioType
  layoutPreset?: BigScreenLayoutPresetType
  homePageId: EntityId
  pages: BigScreenPage[]
  components: BigScreenComponent[]
  groups: BigScreenGroup[]
  globalVariables: BigScreenVariable[]
  assets: BigScreenAsset[]
  capturedAt: ISODateTimeString
}

export type BigScreenRuntimeSource = 'preview' | 'published' | 'presentation' | 'editor'

export interface BigScreenRuntimePageOption {
  label: string
  value: EntityId
}

export interface BigScreenRuntimeContext {
  source: BigScreenRuntimeSource
  snapshot: BigScreenSnapshot
  activePageId: EntityId
  activePage: BigScreenPage
  pageOptions: BigScreenRuntimePageOption[]
  componentCount: number
  visibleComponentCount: number
  variables: Record<string, unknown>
  assets: Record<string, BigScreenAsset>
  readonly: boolean
}

export interface BigScreenPublishConfig {
  accessMode: 'public' | 'password' | 'token'
  accessKey: string
  viewUrl: string
  passwordHash?: string
  tokenSecretKey?: string
  tokenSecretKeyMasked?: string
  tokenExpireSeconds?: number
  publishedVersionId?: EntityId
  publishStatus?: 'unpublished' | 'published' | 'offline'
  offlineAt?: ISODateTimeString
}

export interface BigScreen {
  id: EntityId
  name: string
  description?: string
  status: BigScreenStatus
  deviceMode: BigScreenDeviceMode
  homePageId: EntityId
  pages: BigScreenPage[]
  components: BigScreenComponent[]
  groups: BigScreenGroup[]
  globalVariables: BigScreenVariable[]
  assets: BigScreenAsset[]
  draftSnapshot: BigScreenSnapshot
  publishedSnapshot?: BigScreenSnapshot
  publishConfig?: BigScreenPublishConfig
  versionCount: number
  latestVersionId?: EntityId
  currentPublishedVersionId?: EntityId
  createdBy: string
  updatedBy: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
  publishedAt?: ISODateTimeString
}

export interface BigScreenVersion {
  id: EntityId
  screenId: EntityId
  name: string
  versionNo: number
  snapshot: BigScreenSnapshot
  status: 'published' | 'history'
  locked: boolean
  createdBy: string
  createdAt: ISODateTimeString
}

export interface BigScreenListFilters {
  keyword: string
  status: BigScreenStatus | 'all'
  deviceMode: BigScreenDeviceMode | 'all'
  sortMode: 'updated_desc' | 'updated_asc' | 'name_asc'
}

export interface BigScreenListStats {
  total: number
  draft: number
  published: number
  offline: number
}

export interface BigScreenListResult {
  items: BigScreen[]
  stats: BigScreenListStats
}

export interface CreateBigScreenRequest {
  name: string
  description?: string
  templateId?: string
  deviceMode?: BigScreenDeviceMode
  ratioType?: BigScreenRatioType
  canvasWidth?: number
  canvasHeight?: number
  layoutPreset?: BigScreenLayoutPresetType
}

export interface SaveBigScreenRequest {
  name: string
  description?: string
  deviceMode: BigScreenDeviceMode
  homePageId: EntityId
  draftSnapshot: BigScreenSnapshot
}

export interface CreatePreviewRequest {
  startPageId: EntityId
  snapshot: BigScreenSnapshot
  sourceType: 'draft' | 'version'
  sourceVersionId?: EntityId
}

export interface BigScreenPreviewSession {
  id: EntityId
  screenId: EntityId
  startPageId: EntityId
  snapshot: BigScreenSnapshot
  sourceType: 'draft' | 'version'
  sourceVersionId?: EntityId
  createdAt: ISODateTimeString
  expiresAt: ISODateTimeString
}

export interface PublishBigScreenRequest {
  publishType: 'latest' | 'version'
  versionId?: EntityId
  accessMode: 'public' | 'password' | 'token'
  password?: string
  tokenExpireSeconds?: number
}

export interface PublishBigScreenResponse {
  screenId: EntityId
  status: 'published'
  viewUrl: string
  accessKey: string
  secretKey?: string
  publishedAt: ISODateTimeString
}

export interface BigScreenPublishedAccessResult {
  state: 'ok' | 'password_required' | 'token_required' | 'denied' | 'offline' | 'not_found'
  message?: string
  screen?: BigScreen
  snapshot?: BigScreenSnapshot
}

export interface BigScreenSharingTokenResult {
  code: 'ok'
  data: string
  msg: string
}

export interface BigScreenTemplate {
  id: EntityId
  projectId: EntityId
  name: string
  description?: string
  coverUrl?: string
  scope: 'private' | 'project' | 'shared'
  sourceScreenId: EntityId
  sourceVersionId?: EntityId
  snapshot: BigScreenSnapshot
  isDesensitized: boolean
  createdBy: string
  updatedBy: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface CreateBigScreenTemplateRequest {
  name: string
  description?: string
  scope: BigScreenTemplate['scope']
  isDesensitized: boolean
  coverUrl?: string
  sourceVersionId?: EntityId
  snapshot?: BigScreenSnapshot
}

export interface UpdateBigScreenTemplateRequest {
  name?: string
  description?: string
  scope?: BigScreenTemplate['scope']
  coverUrl?: string
}

export type BigScreenResourceAssetType = 'image' | 'video' | 'font' | 'template-cover'

export type BigScreenResourceAssetCategory =
  | 'main-title'
  | 'sub-title'
  | 'background-frame'
  | 'decoration-line'
  | 'icon'
  | 'other'
  | 'font'

export interface BigScreenResourceAsset {
  id: EntityId
  projectId: EntityId
  name: string
  type: BigScreenResourceAssetType
  category: BigScreenResourceAssetCategory
  source: 'official' | 'local-upload'
  fileUrl: string
  fileSize: number
  mimeType: string
  extension: string
  usageCount: number
  licenseConfirmed?: boolean
  fontFamily?: string
  warningMessage?: string
  createdBy: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface UploadBigScreenAssetRequest {
  name: string
  type: BigScreenResourceAssetType
  category: BigScreenResourceAssetCategory
  source?: 'official' | 'local-upload'
  fileUrl: string
  fileSize: number
  mimeType: string
  extension: string
  licenseConfirmed?: boolean
  fontFamily?: string
}

export interface BigScreenPresentationItem {
  id: EntityId
  screenId: EntityId
  publishedVersionId?: EntityId
  displayName: string
  durationSeconds: number
  order: number
}

export interface BigScreenPresentationPlan {
  id: EntityId
  projectId: EntityId
  name: string
  items: BigScreenPresentationItem[]
  loopMode: 'loop' | 'once'
  status: 'draft' | 'active'
  createdBy: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface SaveBigScreenPresentationPlanRequest {
  name: string
  items: BigScreenPresentationItem[]
  loopMode: BigScreenPresentationPlan['loopMode']
  status: BigScreenPresentationPlan['status']
}

export interface BigScreenPresentationRuntimeItem extends BigScreenPresentationItem {
  state: 'ok' | 'offline' | 'denied' | 'missing'
  message?: string
  snapshot?: BigScreenSnapshot
  accessKey?: string
}

export interface BigScreenPresentationRuntime {
  plan: BigScreenPresentationPlan
  items: BigScreenPresentationRuntimeItem[]
}

export interface BigScreenDevIssueAction {
  id: EntityId
  label: string
  actionType:
    | 'locate-component'
    | 'open-data-panel'
    | 'retry-query'
    | 'save-screen'
    | 'auto-align'
    | 'repair-chart-fields'
    | 'increase-refresh-interval'
    | 'compress-asset'
    | 'unify-font'
    | 'ignore'
  payload?: Record<string, unknown>
}

export interface BigScreenDevIssue {
  id: EntityId
  screenId: EntityId
  pageId?: EntityId
  componentId?: EntityId
  module: 'screen' | 'query' | 'terminal' | 'asset' | 'layout' | 'style'
  ruleCode: string
  severity: 'error' | 'warning' | 'resolved'
  title: string
  description: string
  solution: string
  quickActions: BigScreenDevIssueAction[]
  createdAt: ISODateTimeString
  resolvedAt?: ISODateTimeString
}

export interface BigScreenDevToolsCheckResult {
  status: 'unknown' | 'green' | 'yellow' | 'red'
  checkedAt: ISODateTimeString
  issues: BigScreenDevIssue[]
}

export type BigScreenSmartVJobType =
  | 'mobile-layout-conversion'
  | 'metric-system-generation'
  | 'theme-switch'
  | 'doc-search'

export interface BigScreenSmartVProgress {
  stepName: string
  status: 'pending' | 'running' | 'success' | 'failed'
  message?: string
}

export interface BigScreenSmartVJob {
  id: EntityId
  screenId: EntityId
  type: BigScreenSmartVJobType
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
  input: Record<string, unknown>
  output?: {
    snapshot?: BigScreenSnapshot
    answer?: string
    documents?: Array<{ title: string, summary: string, path: string }>
    themeName?: string
    operationSummary?: string
  }
  progress: BigScreenSmartVProgress[]
  errorMessage?: string
  createdAt: ISODateTimeString
  updatedAt: ISODateTimeString
}

export interface CreateBigScreenSmartVJobRequest {
  type: BigScreenSmartVJobType
  input: Record<string, unknown>
  snapshot: BigScreenSnapshot
}

export type EditorDirtyState = 'clean' | 'dirty' | 'saving' | 'saved' | 'save_failed'
