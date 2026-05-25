<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import type {
  BigScreenComponent,
  BigScreenEarth3DContainerConfig,
  BigScreenMap3DContainerConfig,
  BigScreenThreeDLayer,
} from '@/types/bigScreen'
import { defaultEarth3DContainerConfig, defaultMap3DContainerConfig } from './threeDComponentRegistry'
import { applyDataPipeline, resolveFieldName } from './dataEngine'

const props = withDefaults(
  defineProps<{
    component: BigScreenComponent
    focusedLayerId?: string
    editMode?: boolean
  }>(),
  {
    focusedLayerId: '',
    editMode: false,
  },
)

const hostRef = ref<HTMLElement | null>(null)
const diagnostics = ref({ webgl2: 'unknown', hardwareAcceleration: 'unknown', message: '' })

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let rootGroup: THREE.Group | null = null
let animationFrame = 0
let resizeObserver: ResizeObserver | null = null
let startedAt = performance.now()

const containerConfig = computed<BigScreenMap3DContainerConfig | BigScreenEarth3DContainerConfig>(() =>
  props.component.type === 'earth3d'
    ? {
        ...defaultEarth3DContainerConfig,
        ...(props.component.style.containerConfig as Partial<BigScreenEarth3DContainerConfig> | undefined),
      }
    : {
        ...defaultMap3DContainerConfig,
        ...(props.component.style.containerConfig as Partial<BigScreenMap3DContainerConfig> | undefined),
      },
)

const layers = computed<BigScreenThreeDLayer[]>(() =>
  Array.isArray(props.component.style.layers)
    ? [...props.component.style.layers as BigScreenThreeDLayer[]].sort((left, right) => left.zIndex - right.zIndex)
    : [],
)

const visibleLayers = computed(() => layers.value.filter((layer) => layer.visible))

const layerRows = (layer: BigScreenThreeDLayer): Array<Record<string, unknown>> => {
  const parsedRows = layer.dataBinding?.lastQueryState?.parsedTable?.rows.map((row) => row.values) ?? []
  return applyDataPipeline(parsedRows.length ? parsedRows : layer.dataBinding?.staticRows ?? [], layer.dataBinding)
}

const getRowValue = (row: Record<string, unknown>, key: string, fallback: number): number =>
  Number(row[key] ?? fallback)

const getLayerField = (layer: BigScreenThreeDLayer, slotNames: string[], fallbacks: string[]): string =>
  resolveFieldName(layer.dataBinding, slotNames, fallbacks)

const detectDiagnostics = (): void => {
  const canvas = document.createElement('canvas')
  const webgl2 = Boolean(canvas.getContext('webgl2'))

  diagnostics.value = {
    webgl2: webgl2 ? 'ok' : 'unsupported',
    hardwareAcceleration: webgl2 ? 'available' : 'unknown',
    message: webgl2 ? '' : '当前浏览器未检测到 WebGL2，请检查硬件加速或虚拟机图形设置。',
  }
}

const createTextSprite = (text: string, color = '#dbeafe'): THREE.Sprite => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 80
  const context = canvas.getContext('2d')

  if (context) {
    context.fillStyle = 'rgba(2, 6, 23, 0.72)'
    context.strokeStyle = 'rgba(125, 211, 252, 0.55)'
    context.lineWidth = 2
    context.roundRect(8, 12, 240, 52, 8)
    context.fill()
    context.stroke()
    context.fillStyle = color
    context.font = '24px sans-serif'
    context.fillText(text, 22, 47)
  }

  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }))
  sprite.scale.set(1.8, 0.56, 1)
  return sprite
}

const projectMapPoint = (lng: number, lat: number): THREE.Vector3 => {
  const x = ((lng - 104) / 32) * 6.6
  const y = ((lat - 35) / 18) * 4.2
  return new THREE.Vector3(x, y, 0.18)
}

const projectEarthPoint = (lng: number, lat: number, radius = 2.8): THREE.Vector3 => {
  const earthConfig = containerConfig.value as BigScreenEarth3DContainerConfig
  const lon = THREE.MathUtils.degToRad(lng - earthConfig.view.longitude)
  const latRad = THREE.MathUtils.degToRad(lat)
  const x = radius * Math.cos(latRad) * Math.sin(lon)
  const y = radius * Math.sin(latRad)
  const z = radius * Math.cos(latRad) * Math.cos(lon)

  return new THREE.Vector3(x, y, z)
}

const clearScene = (): void => {
  if (!scene || !rootGroup) {
    return
  }

  rootGroup.traverse((object: any) => {
    if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
      object.geometry.dispose()
    }
    if ('material' in object) {
      const material = object.material
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose())
      } else if (material instanceof THREE.Material) {
        material.dispose()
      }
    }
  })
  scene.remove(rootGroup)
  rootGroup = new THREE.Group()
  scene.add(rootGroup)
}

const addLights = (): void => {
  if (!scene) {
    return
  }

  scene.add(new THREE.AmbientLight('#ffffff', 1.1))
  const light = new THREE.DirectionalLight('#ffffff', 1.8)
  light.position.set(5, 6, 8)
  scene.add(light)
}

const createLine = (points: THREE.Vector3[], color: string, opacity = 0.9): THREE.Line => {
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  })
  return new THREE.Line(geometry, material)
}

const createArc = (from: THREE.Vector3, to: THREE.Vector3, height: number, color: string): THREE.Line => {
  const mid = from.clone().lerp(to, 0.5)
  mid.z += height
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to)
  return createLine(curve.getPoints(32), color, 0.86)
}

const drawMapBase = (): void => {
  const group = rootGroup
  if (!group) {
    return
  }

  const config = containerConfig.value as BigScreenMap3DContainerConfig
  const regions: Array<Array<[number, number]>> = [
    [[92, 44], [103, 48], [116, 44], [123, 35], [113, 27], [98, 28], [86, 34]],
    [[106, 35], [118, 36], [122, 29], [112, 22], [101, 25], [98, 31]],
    [[76, 39], [92, 44], [86, 34], [79, 30], [73, 34]],
    [[116, 44], [132, 45], [128, 34], [123, 35]],
    [[98, 28], [112, 22], [109, 18], [94, 21], [88, 26]],
  ]

  regions.forEach((region, index) => {
    const shape = new THREE.Shape()
    region.forEach(([lng, lat], pointIndex) => {
      const point = projectMapPoint(lng, lat)
      if (pointIndex === 0) {
        shape.moveTo(point.x, point.y)
      } else {
        shape.lineTo(point.x, point.y)
      }
    })

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(0.06, Number(config.adminMap.extrusionHeight ?? 1) * 0.28),
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.03,
    })
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(String(config.adminMap.fillStyle.color ?? '#123e7a')),
      transparent: true,
      opacity: Number(config.adminMap.fillStyle.opacity ?? 0.72),
      roughness: Number(config.adminMap.fillStyle.roughness ?? 0.55),
      metalness: Number(config.adminMap.fillStyle.metalness ?? 0.25),
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.z = -0.22 - index * 0.01
    group.add(mesh)

    const points = [...region, region[0]!].map(([lng, lat]) => projectMapPoint(lng, lat).setZ(0.18))
    group.add(createLine(points, String(config.adminMap.outerBorder.color ?? '#5bc9ff'), Number(config.adminMap.outerBorder.opacity ?? 0.9)))
  })

  if (config.southChinaSeaInset.enabled) {
    const frame = new THREE.Group()
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.9),
      new THREE.MeshBasicMaterial({ color: config.southChinaSeaInset.seaColor, transparent: true, opacity: 0.78 }),
    )
    frame.add(plane)
    const islandMaterial = new THREE.MeshBasicMaterial({ color: config.southChinaSeaInset.landColor })
    const island = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.04), islandMaterial)
    island.position.set(-0.22, 0.02, 0.05)
    frame.add(island)
    const label = createTextSprite('南海诸岛', '#bfdbfe')
    label.scale.set(0.72, 0.22, 1)
    label.position.set(0.08, -0.28, 0.08)
    frame.add(label)
    frame.position.set(3.4, -2.1, 0.4)
    group.add(frame)
  }
}

const addMapLayer = (layer: BigScreenThreeDLayer): void => {
  const group = rootGroup
  if (!group) {
    return
  }

  const rows = layerRows(layer)
  const color = String(layer.styleConfig.color ?? '#38bdf8')
  const lngField = getLayerField(layer, ['lng', 'longitude'], ['lng'])
  const latField = getLayerField(layer, ['lat', 'latitude'], ['lat'])
  const valueField = getLayerField(layer, ['value', 'measure', 'size', 'height'], ['value'])
  const nameField = getLayerField(layer, ['name', 'label'], ['name', 'label'])
  const targetLngField = getLayerField(layer, ['targetLng', 'toLng'], ['targetLng'])
  const targetLatField = getLayerField(layer, ['targetLat', 'toLat'], ['targetLat'])
  const maxValue = Math.max(1, ...rows.map((row) => Number(row[valueField] ?? row.value ?? 0)))

  rows.forEach((row, index) => {
    const point = projectMapPoint(getRowValue(row, lngField, 100 + index * 4), getRowValue(row, latField, 26 + index * 3))
    const value = Number(row[valueField] ?? row.value ?? 100)
    const scale = 0.65 + value / maxValue

    if (['adminHeat', 'classicHeat', 'hexHeat', 'gridHeat', 'isochrone'].includes(layer.type)) {
      const geometry = layer.type === 'isochrone'
        ? new THREE.RingGeometry(0.34 * scale, 0.42 * scale, 36)
        : new THREE.CircleGeometry(0.34 * scale, layer.type === 'hexHeat' ? 6 : 32)
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: layer.type === 'isochrone' ? 0.24 : 0.2, side: THREE.DoubleSide })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(point).setZ(0.24)
      group.add(mesh)
    }

    if (layer.type === 'bubble') {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 * scale, 24, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, transparent: true, opacity: 0.82 }),
      )
      mesh.position.copy(point).setZ(0.52 + 0.05 * index)
      group.add(mesh)
    }

    if (layer.type === 'iconScatter') {
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16 * scale),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18 }),
      )
      mesh.position.copy(point).setZ(0.56)
      group.add(mesh)
    }

    if (layer.type === 'bar3d') {
      const height = (0.36 + (value / maxValue) * 1.4) * Number(layer.styleConfig.heightScale ?? 1)
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, height),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18 }),
      )
      mesh.position.copy(point).setZ(0.24 + height / 2)
      group.add(mesh)
    }

    if (layer.type === 'infoLabel') {
      const sprite = createTextSprite(String(row[nameField] ?? row.label ?? row.name ?? '标签'), '#e2e8f0')
      sprite.position.copy(point).setZ(0.9)
      group.add(sprite)
    }

    if (layer.type === 'flyLine' || layer.type === 'trajectoryLine') {
      const target = projectMapPoint(getRowValue(row, targetLngField, 116), getRowValue(row, targetLatField, 39)).setZ(0.42)
      group.add(createArc(point.clone().setZ(0.42), target, 1.2, color))
    }

    if (layer.type === 'surfaceDecoration' || layer.type === 'risingChar' || layer.type === 'particle') {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.16 * scale, 0.012, 8, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72 }),
      )
      mesh.position.copy(point).setZ(0.5 + index * 0.08)
      group.add(mesh)
    }
  })
}

const drawEarthBase = (): void => {
  const group = rootGroup
  if (!group) {
    return
  }

  const config = containerConfig.value as BigScreenEarth3DContainerConfig
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 64, 48),
    new THREE.MeshStandardMaterial({
      color: '#1d4ed8',
      roughness: config.material.roughness,
      metalness: config.material.metalness,
      emissive: '#082f49',
      emissiveIntensity: 0.35,
    }),
  )
  group.add(earth)

  const wire = new THREE.Mesh(
    new THREE.SphereGeometry(2.83, 32, 18),
    new THREE.MeshBasicMaterial({ color: '#93c5fd', transparent: true, opacity: 0.16, wireframe: true }),
  )
  group.add(wire)

  if (config.glow.enabled) {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(2.8 * config.glow.range, 48, 32),
      new THREE.MeshBasicMaterial({ color: config.glow.color, transparent: true, opacity: 0.08 * config.glow.intensity, side: THREE.BackSide }),
    )
    group.add(glow)
  }

  if (config.cloud.enabled) {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(2.8 * config.cloud.scale, 48, 32),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: config.cloud.opacity * 0.18, wireframe: true }),
    )
    cloud.name = 'earth-cloud'
    group.add(cloud)
  }
}

const addEarthLayer = (layer: BigScreenThreeDLayer): void => {
  const group = rootGroup
  if (!group || (layer.type !== 'bubble' && layer.type !== 'flyLine')) {
    return
  }

  const rows = layerRows(layer)
  const color = String(layer.styleConfig.color ?? '#38bdf8')
  const lngField = getLayerField(layer, ['lng', 'longitude'], ['lng'])
  const latField = getLayerField(layer, ['lat', 'latitude'], ['lat'])
  const targetLngField = getLayerField(layer, ['targetLng', 'toLng'], ['targetLng'])
  const targetLatField = getLayerField(layer, ['targetLat', 'toLat'], ['targetLat'])

  rows.forEach((row, index) => {
    const point = projectEarthPoint(getRowValue(row, lngField, index * 40 - 80), getRowValue(row, latField, 20), 2.92)

    if (layer.type === 'flyLine') {
      const target = projectEarthPoint(getRowValue(row, targetLngField, 116), getRowValue(row, targetLatField, 39), 2.92)
      const mid = point.clone().lerp(target, 0.5).normalize().multiplyScalar(3.9)
      const curve = new THREE.QuadraticBezierCurve3(point, mid, target)
      group.add(createLine(curve.getPoints(36), color, 0.86))
      return
    }

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(0.06, Number(layer.styleConfig.size ?? 14) / 90), 20, 14),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45 }),
    )
    mesh.position.copy(point)
    group.add(mesh)
  })
}

const rebuildScene = (): void => {
  if (!scene || !camera || !renderer) {
    return
  }

  clearScene()
  if (!rootGroup) {
    return
  }

  scene.background = null
  if (props.component.type === 'earth3d') {
    const config = containerConfig.value as BigScreenEarth3DContainerConfig
    if (config.background.enabled) {
      scene.background = new THREE.Color(config.background.color)
    }
    camera.position.set(0, 0, 7.2 / Math.max(0.4, config.view.zoom / 3))
    drawEarthBase()
    visibleLayers.value.forEach(addEarthLayer)
  } else {
    const config = containerConfig.value as BigScreenMap3DContainerConfig
    if (config.background.enabled) {
      scene.background = new THREE.Color(config.background.color)
    }
    const pitch = THREE.MathUtils.degToRad(config.camera.pitch)
    const bearing = THREE.MathUtils.degToRad(config.camera.bearing)
    camera.position.set(Math.sin(bearing) * 4.5, -Math.cos(bearing) * 5.6, 5.8 * Math.sin(pitch) + 2.2)
    camera.lookAt(0, 0, 0)
    drawMapBase()
    visibleLayers.value.forEach(addMapLayer)
  }
}

const resizeRenderer = (): void => {
  const host = hostRef.value
  if (!host || !renderer || !camera) {
    return
  }

  const width = Math.max(100, host.clientWidth)
  const height = Math.max(100, host.clientHeight)
  renderer.setSize(width, height, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

const animate = (): void => {
  if (renderer && scene && camera && rootGroup) {
    const elapsed = (performance.now() - startedAt) / 1000
    if (props.component.type === 'earth3d') {
      const config = containerConfig.value as BigScreenEarth3DContainerConfig
      if (config.autoRotate.enabled) {
        rootGroup.rotation.y = elapsed * config.autoRotate.speed * 0.12
      }
      const cloud = rootGroup.getObjectByName('earth-cloud')
      if (cloud) {
        cloud.rotation.y = elapsed * config.cloud.speed * 0.3
      }
    }
    renderer.render(scene, camera)
  }

  animationFrame = window.requestAnimationFrame(animate)
}

const initialize = (): void => {
  const host = hostRef.value

  if (!host) {
    return
  }

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearAlpha(0)
  host.appendChild(renderer.domElement)
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  rootGroup = new THREE.Group()
  scene.add(rootGroup)
  addLights()
  resizeRenderer()
  rebuildScene()
  animate()

  resizeObserver = new ResizeObserver(() => {
    resizeRenderer()
    rebuildScene()
  })
  resizeObserver.observe(host)
}

watch(
  () => props.component.style,
  () => {
    startedAt = performance.now()
    rebuildScene()
  },
  { deep: true },
)

onMounted(() => {
  detectDiagnostics()
  initialize()
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  renderer?.dispose()
  renderer?.domElement.remove()
  renderer = null
  scene = null
  camera = null
  rootGroup = null
})
</script>

<template>
  <div ref="hostRef" class="three-d-renderer" :class="{ focused: editMode }">
    <div class="scene-badges">
      <span>{{ component.type === 'earth3d' ? '3D 地球' : '3D 地图' }}</span>
      <span>{{ visibleLayers.length }} 图层</span>
      <span v-if="focusedLayerId">编辑图层</span>
    </div>
    <div v-if="diagnostics.message" class="diagnostics">{{ diagnostics.message }}</div>
  </div>
</template>

<style scoped lang="scss">
.three-d-renderer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
  background:
    radial-gradient(circle at 50% 22%, rgba(56, 189, 248, 0.16), transparent 32%),
    #020617;
}

.three-d-renderer.focused {
  box-shadow: inset 0 0 0 2px rgba(56, 189, 248, 0.82);
}

.three-d-renderer :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
}

.scene-badges {
  position: absolute;
  left: 12px;
  top: 12px;
  display: flex;
  gap: 6px;
  pointer-events: none;
}

.scene-badges span,
.diagnostics {
  border: 1px solid rgba(125, 211, 252, 0.35);
  border-radius: 6px;
  background: rgba(2, 6, 23, 0.62);
  color: #dbeafe;
  font-size: 12px;
}

.scene-badges span {
  padding: 5px 8px;
}

.diagnostics {
  position: absolute;
  right: 12px;
  bottom: 12px;
  max-width: 280px;
  padding: 8px 10px;
  color: #fde68a;
}
</style>
