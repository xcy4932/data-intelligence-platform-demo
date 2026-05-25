import type {
  BigScreenDataBindingConfig,
  BigScreenEarth3DContainerConfig,
  BigScreenMap3DContainerConfig,
  BigScreenThreeDLayer,
  BigScreenThreeDLayerType,
} from '@/types/bigScreen'
import type { DefaultComponentRegistryItem } from './defaultComponentRegistry'

export const map3DLayerTypes: Array<{ type: BigScreenThreeDLayerType, name: string }> = [
  { type: 'bubble', name: '气泡层' },
  { type: 'iconScatter', name: '图标散点层' },
  { type: 'bar3d', name: '柱状层' },
  { type: 'infoLabel', name: '信息标签层' },
  { type: 'flyLine', name: '飞线层' },
  { type: 'trajectoryLine', name: '轨迹线层' },
  { type: 'adminHeat', name: '行政区域热力层' },
  { type: 'classicHeat', name: '经典热力层' },
  { type: 'hexHeat', name: '蜂窝热力层' },
  { type: 'gridHeat', name: '网格热力层' },
  { type: 'surfaceDecoration', name: '地表装饰层' },
  { type: 'risingChar', name: '上升字符流' },
  { type: 'particle', name: '粒子系统' },
  { type: 'isochrone', name: '等时圈层' },
]

export const earth3DLayerTypes: Array<{ type: BigScreenThreeDLayerType, name: string }> = [
  { type: 'bubble', name: '地球气泡层' },
  { type: 'flyLine', name: '地球飞线层' },
]

export const defaultMap3DContainerConfig: BigScreenMap3DContainerConfig = {
  mapType: 'china',
  background: { enabled: false, color: '#000000' },
  gesture: {
    enabled: true,
    zoomable: true,
    pannable: true,
    pitchable: true,
    rotateable: true,
  },
  boundary: {
    sourceType: 'system',
    systemRegion: 'china',
    customGeoJsonAssetId: null,
  },
  adminMap: {
    enabled: true,
    outerBorder: { width: 2, color: '#5bc9ff', opacity: 0.9 },
    innerBorder: { width: 1, color: '#1d9bf0', opacity: 0.55 },
    outerGlow: { enabled: true, color: '#2e8bff', intensity: 1.2, radius: 18 },
    outerFlowLine: { enabled: true, color: '#7dd3fc', width: 2, speed: 1, length: 0.22 },
    extrusionHeight: 1,
    fillStyle: { color: '#123e7a', opacity: 0.72, metalness: 0.25, roughness: 0.55 },
    labelStyle: { visible: true, fontSize: 13, color: '#dbeafe', fontWeight: 600 },
  },
  southChinaSeaInset: {
    enabled: true,
    position: 'right-bottom',
    scale: 1,
    marginX: 16,
    marginY: 16,
    seaColor: '#001b3a',
    landColor: '#123e7a',
    borderStyle: { color: '#7dd3fc', width: 1 },
    frameStyle: { color: '#38bdf8', width: 1 },
    labelStyle: { color: '#bfdbfe', fontSize: 10 },
  },
  amapBaseMap: {
    enabled: false,
    styleType: 'preset',
    presetStyle: 'dark-blue',
    customStyleId: '',
    key: '',
    securityJsCode: '',
    contentControl: {},
    filter: {
      enabled: false,
      brightness: 1,
      contrast: 1,
      grayscale: 0,
      hueRotate: 0,
      invert: 0,
      saturate: 1,
      opacity: 1,
    },
  },
  camera: {
    center: [104, 35],
    zoom: 4,
    pitch: 45,
    bearing: 0,
  },
  drill: {
    enabled: true,
    currentRegion: '全国',
    history: [],
  },
  customRegions: [],
}

export const defaultEarth3DContainerConfig: BigScreenEarth3DContainerConfig = {
  view: {
    longitude: 104,
    latitude: 35,
    zoom: 3,
    minZoom: 2,
    maxZoom: 22,
  },
  gesture: {
    enabled: true,
    zoomable: true,
    rotateable: true,
  },
  adminMap: {
    outerBorder: { width: 1, color: '#7dd3fc', opacity: 0.72 },
    innerBorder: { width: 1, color: '#1d4ed8', opacity: 0.35 },
  },
  material: {
    metalness: 0.3,
    roughness: 0.6,
    diffuseTextureAssetId: null,
    normalTextureAssetId: null,
    normalScale: 1,
  },
  labelStyle: { visible: true, fontSize: 12, color: '#dbeafe' },
  background: { enabled: false, color: '#000000' },
  autoRotate: { enabled: true, speed: 1, pauseOnHover: true },
  glow: { enabled: true, range: 1.5, intensity: 1, color: '#2e8bff' },
  cloud: { enabled: true, scale: 1.03, opacity: 0.45, speed: 0.2 },
  light: {
    ambientColor: '#ffffff',
    ambientIntensity: 0.8,
    directionalColor: '#ffffff',
    directionalIntensity: 1.2,
    directionalPosition: [1, 1, 1],
  },
}

const layerRows = [
  { name: '北京', lng: 116.4, lat: 39.9, value: 12680, targetLng: 121.5, targetLat: 31.2, label: '北京' },
  { name: '上海', lng: 121.5, lat: 31.2, value: 18920, targetLng: 113.2, targetLat: 23.1, label: '上海' },
  { name: '广州', lng: 113.2, lat: 23.1, value: 14260, targetLng: 104.1, targetLat: 30.7, label: '广州' },
  { name: '成都', lng: 104.1, lat: 30.7, value: 9860, targetLng: 116.4, targetLat: 39.9, label: '成都' },
]

export const createThreeDLayerDataBinding = (): BigScreenDataBindingConfig => ({
  sourceType: 'static',
  fields: [
    { slot: 'name', fieldName: 'name', fieldType: 'dimension' },
    { slot: 'longitude', fieldName: 'lng', fieldType: 'measure' },
    { slot: 'latitude', fieldName: 'lat', fieldType: 'measure' },
    { slot: 'value', fieldName: 'value', fieldType: 'measure', aggregation: 'sum' },
    { slot: 'targetLongitude', fieldName: 'targetLng', fieldType: 'measure' },
    { slot: 'targetLatitude', fieldName: 'targetLat', fieldType: 'measure' },
  ],
  fieldSlots: {
    position: ['lng', 'lat'],
    value: ['value'],
    target: ['targetLng', 'targetLat'],
  },
  updateMode: 'manual',
  refreshIntervalSeconds: 60,
  sortRules: [],
  filterRules: [],
  topN: { enabled: false, mode: 'all', count: 10, measureField: 'value' },
  staticRows: layerRows,
})

export const createDefaultThreeDLayer = (
  parentComponentId: string,
  type: BigScreenThreeDLayerType,
  index = 0,
): BigScreenThreeDLayer => ({
  id: `${parentComponentId}-layer-${type}-${index + 1}`,
  parentComponentId,
  type,
  name: map3DLayerTypes.find((item) => item.type === type)?.name ?? earth3DLayerTypes.find((item) => item.type === type)?.name ?? '子图层',
  visible: true,
  locked: false,
  zIndex: index + 1,
  dataBinding: createThreeDLayerDataBinding(),
  styleConfig: {
    color: type === 'flyLine' ? '#f59e0b' : '#38bdf8',
    size: type === 'bubble' ? 18 : 12,
    heightScale: 1,
    opacity: 0.84,
    labelVisible: type === 'infoLabel',
    animationEnabled: true,
  },
  animationConfig: {
    enabled: true,
    speed: 1,
    loop: true,
  },
  interactions: [],
})

export const threeDComponentRegistry: DefaultComponentRegistryItem[] = [
  {
    type: 'map3d',
    name: '3D 地图',
    category: '场景',
    width: 800,
    height: 520,
    style: {
      containerConfig: defaultMap3DContainerConfig,
      layers: [
        createDefaultThreeDLayer('map3d-seed', 'adminHeat', 0),
        createDefaultThreeDLayer('map3d-seed', 'bubble', 1),
        createDefaultThreeDLayer('map3d-seed', 'bar3d', 2),
        createDefaultThreeDLayer('map3d-seed', 'flyLine', 3),
        createDefaultThreeDLayer('map3d-seed', 'infoLabel', 4),
      ],
      diagnostics: {
        webgl2: 'unknown',
        hardwareAcceleration: 'unknown',
        blackScreenHint: '',
      },
    },
  },
  {
    type: 'earth3d',
    name: '3D 地球',
    category: '场景',
    width: 800,
    height: 520,
    style: {
      containerConfig: defaultEarth3DContainerConfig,
      layers: [
        createDefaultThreeDLayer('earth3d-seed', 'bubble', 0),
        createDefaultThreeDLayer('earth3d-seed', 'flyLine', 1),
      ],
      diagnostics: {
        webgl2: 'unknown',
        hardwareAcceleration: 'unknown',
        blackScreenHint: '',
      },
    },
  },
]

export const threeDComponentTypes = new Set(threeDComponentRegistry.map((item) => item.type))
