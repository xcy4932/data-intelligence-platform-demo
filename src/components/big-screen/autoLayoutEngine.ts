import type {
  BigScreenAutoLayoutOptions,
  BigScreenAutoLayoutResult,
  BigScreenComponent,
  BigScreenComponentLayout,
  BigScreenLayoutIssue,
  BigScreenPage,
  BigScreenSnapshot,
} from '@/types/bigScreen'

type LayoutRole = 'title' | 'kpi' | 'mainVisual' | 'chart' | 'control' | 'container' | 'decorative' | 'media'

interface LayoutSlot {
  x: number
  y: number
  width: number
  height: number
}

interface LayoutItem {
  id: string
  role: LayoutRole
  components: BigScreenComponent[]
  bounds: LayoutSlot
  locked: boolean
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const createIssue = (
  code: BigScreenLayoutIssue['code'],
  message: string,
  patch: Partial<BigScreenLayoutIssue> = {},
): BigScreenLayoutIssue => ({
  id: `layout-issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  severity: 'info',
  code,
  message,
  ...patch,
})

const snap = (value: number, gridSize: number): number => Math.round(value / gridSize) * gridSize

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

const inferLayoutRole = (component: BigScreenComponent): LayoutRole => {
  if (component.marker?.includes('layout-guide')) {
    return 'decorative'
  }

  if (component.type === 'title') {
    return 'title'
  }

  if (['singleText', 'multiText', 'datetime', 'date', 'time', 'weekday'].includes(component.type)) {
    return 'control'
  }

  if (component.type === 'metricCard' || component.type === 'flipNumber') {
    return 'kpi'
  }

  if (component.type === 'map3d' || component.type === 'earth3d') {
    return 'mainVisual'
  }

  if (['select', 'multiSelect', 'treeSelect', 'treeMultiSelect', 'datePicker', 'hotspot'].includes(component.type)) {
    return 'control'
  }

  if (['repeater', 'carousel', 'tabs'].includes(component.type)) {
    return 'container'
  }

  if (['rectangle', 'circle'].includes(component.type)) {
    return 'decorative'
  }

  if (['image', 'video', 'iframe', 'videoStream'].includes(component.type)) {
    return 'media'
  }

  return 'chart'
}

const isDecorativeComponent = (component: BigScreenComponent): boolean =>
  ['rectangle', 'circle'].includes(component.type) || component.marker?.includes('layout-guide')

const getBounds = (components: BigScreenComponent[]): LayoutSlot => {
  const minX = Math.min(...components.map((component) => component.layout.x))
  const minY = Math.min(...components.map((component) => component.layout.y))
  const maxX = Math.max(...components.map((component) => component.layout.x + component.layout.width))
  const maxY = Math.max(...components.map((component) => component.layout.y + component.layout.height))

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  }
}

const buildLayoutItems = (
  components: BigScreenComponent[],
  selectedComponentIds: Set<string>,
  mode: BigScreenAutoLayoutOptions['mode'],
): LayoutItem[] => {
  const candidates = mode === 'selection'
    ? components.filter((component) => selectedComponentIds.has(component.id))
    : components.filter((component) => component.visible)
  const visited = new Set<string>()
  const items: LayoutItem[] = []

  candidates.forEach((component) => {
    if (visited.has(component.id)) {
      return
    }

    const groupedComponents = component.parentGroupId
      ? candidates.filter((item) => item.parentGroupId === component.parentGroupId)
      : [component]

    groupedComponents.forEach((item) => visited.add(item.id))
    items.push({
      id: component.parentGroupId ?? component.id,
      role: groupedComponents.some((item) => inferLayoutRole(item) === 'mainVisual')
        ? 'mainVisual'
        : inferLayoutRole(component),
      components: groupedComponents,
      bounds: getBounds(groupedComponents),
      locked: groupedComponents.some((item) => item.locked),
    })
  })

  return items
}

const roleOrder: Record<LayoutRole, number> = {
  title: 0,
  control: 1,
  kpi: 2,
  mainVisual: 3,
  chart: 4,
  media: 5,
  container: 6,
  decorative: 7,
}

const getPreferredHeight = (item: LayoutItem, page: BigScreenPage, mode: BigScreenAutoLayoutOptions['mode']): number => {
  if (mode === 'mobile') {
    if (item.role === 'title') {
      return 64
    }
    if (item.role === 'kpi' || item.role === 'control') {
      return 96
    }
    if (item.role === 'decorative') {
      return 52
    }
    return Math.min(320, Math.max(220, Math.round(item.bounds.height * 0.5)))
  }

  if (item.role === 'title') {
    return Math.min(96, Math.max(64, Math.round(page.height * 0.075)))
  }

  if (item.role === 'kpi') {
    return Math.min(160, Math.max(116, Math.round(page.height * 0.13)))
  }

  if (item.role === 'control') {
    return 64
  }

  if (item.role === 'mainVisual') {
    return Math.round(page.height * 0.44)
  }

  if (item.role === 'decorative') {
    return Math.min(120, Math.max(48, item.bounds.height))
  }

  return Math.min(420, Math.max(240, Math.round(page.height * 0.28)))
}

const getMaxColumnsForArea = (area: LayoutSlot, preferredMinWidth: number, absoluteMax: number): number =>
  Math.max(1, Math.min(absoluteMax, Math.floor((area.width + 1) / preferredMinWidth)))

const pickGridColumns = (
  count: number,
  area: LayoutSlot,
  gap: number,
  options: {
    preferredAspect: number
    preferredMinWidth: number
    maxColumns: number
  },
): number => {
  if (count <= 1) {
    return 1
  }

  const maxColumns = Math.max(1, Math.min(count, getMaxColumnsForArea(area, options.preferredMinWidth, options.maxColumns)))
  let bestColumns = 1
  let bestScore = Number.POSITIVE_INFINITY

  for (let columns = 1; columns <= maxColumns; columns += 1) {
    const rows = Math.ceil(count / columns)
    const cellWidth = (area.width - gap * (columns - 1)) / columns
    const cellHeight = (area.height - gap * (rows - 1)) / rows
    const aspect = cellWidth / Math.max(1, cellHeight)
    const emptySlots = columns * rows - count
    const tooShortPenalty = cellHeight < 180 ? (180 - cellHeight) / 60 : 0
    const score = Math.abs(aspect - options.preferredAspect)
      + emptySlots * 0.28
      + tooShortPenalty

    if (score < bestScore) {
      bestScore = score
      bestColumns = columns
    }
  }

  return bestColumns
}

const buildGridSlotsInArea = (
  area: LayoutSlot,
  count: number,
  gap: number,
  options: {
    preferredAspect?: number
    preferredMinWidth?: number
    maxColumns?: number
  } = {},
): LayoutSlot[] => {
  if (count <= 0) {
    return []
  }

  const columns = pickGridColumns(count, area, gap, {
    preferredAspect: options.preferredAspect ?? 1.55,
    preferredMinWidth: options.preferredMinWidth ?? 300,
    maxColumns: options.maxColumns ?? 4,
  })
  const rows = Math.ceil(count / columns)
  const width = (area.width - gap * (columns - 1)) / columns
  const height = (area.height - gap * (rows - 1)) / rows

  return Array.from({ length: count }).map((_, index) => ({
    x: area.x + (index % columns) * (width + gap),
    y: area.y + Math.floor(index / columns) * (height + gap),
    width,
    height,
  }))
}

const setRowSlots = (
  slotMap: Map<string, LayoutSlot>,
  items: LayoutItem[],
  area: LayoutSlot,
  gap: number,
  options: {
    preferredAspect?: number
    preferredMinWidth?: number
    maxColumns?: number
  } = {},
): void => {
  buildGridSlotsInArea(area, items.length, gap, options)
    .forEach((slot, index) => slotMap.set(items[index]!.id, slot))
}

const buildDesktopSlots = (
  page: BigScreenPage,
  items: LayoutItem[],
  margin: number,
  gap: number,
): Map<string, LayoutSlot> => {
  const slotMap = new Map<string, LayoutSlot>()
  const titleItems = items.filter((item) => item.role === 'title')
  const controlItems = items.filter((item) => item.role === 'control')
  const kpiItems = items.filter((item) => item.role === 'kpi')
  const mainItems = items.filter((item) => item.role === 'mainVisual')
  const chartItems = items.filter((item) => item.role === 'chart')
  const supportItems = items.filter((item) => ['media', 'container'].includes(item.role))
  const decorativeItems = items.filter((item) => item.role === 'decorative')
  const visualItems = [...mainItems, ...chartItems, ...supportItems]
  const isWide = page.width / page.height > 2.4
  const contentWidth = page.width - margin * 2
  const contentBottom = page.height - margin
  const maxVisualColumns = isWide ? 8 : visualItems.length >= 16 ? 6 : 4
  let cursorY = margin

  if (titleItems.length) {
    const rows = Math.ceil(titleItems.length / (isWide ? 2 : 1))
    const height = clamp(Math.round(page.height * 0.072), 58, 86)
    setRowSlots(slotMap, titleItems, {
      x: margin,
      y: cursorY,
      width: contentWidth,
      height: rows * height + (rows - 1) * gap,
    }, gap, {
      preferredAspect: isWide ? 4 : 8,
      preferredMinWidth: 620,
      maxColumns: isWide ? 2 : 1,
    })
    cursorY += rows * height + (rows - 1) * gap + gap
  }

  if (controlItems.length) {
    const columns = Math.min(controlItems.length, isWide ? 8 : 5)
    const rows = Math.ceil(controlItems.length / columns)
    const height = 56
    setRowSlots(slotMap, controlItems, {
      x: margin,
      y: cursorY,
      width: contentWidth,
      height: rows * height + (rows - 1) * gap,
    }, gap, {
      preferredAspect: 4.4,
      preferredMinWidth: 220,
      maxColumns: isWide ? 8 : 5,
    })
    cursorY += rows * height + (rows - 1) * gap + gap
  }

  if (kpiItems.length) {
    const columns = Math.min(kpiItems.length, isWide ? 8 : 4)
    const rows = Math.ceil(kpiItems.length / columns)
    const height = clamp(Math.round(page.height * 0.105), 104, 132)
    setRowSlots(slotMap, kpiItems, {
      x: margin,
      y: cursorY,
      width: contentWidth,
      height: rows * height + (rows - 1) * gap,
    }, gap, {
      preferredAspect: 2.4,
      preferredMinWidth: 260,
      maxColumns: isWide ? 8 : 4,
    })
    cursorY += rows * height + (rows - 1) * gap + gap
  }

  const visualY = Math.min(cursorY, Math.max(margin, contentBottom - 160))
  const visualArea: LayoutSlot = {
    x: margin,
    y: visualY,
    width: contentWidth,
    height: Math.max(160, contentBottom - visualY),
  }

  if (mainItems.length && !isWide && visualItems.length >= 5 && visualItems.length <= 14 && visualArea.height >= 480) {
    const mainItem = mainItems[0]!
    const sideItems = visualItems.filter((item) => item.id !== mainItem.id).slice(0, 4)
    const remainingItems = visualItems.filter((item) => item.id !== mainItem.id).slice(4)
    const heroHeight = remainingItems.length
      ? Math.round(visualArea.height * 0.62)
      : visualArea.height
    const sideWidth = Math.round((visualArea.width - gap * 2) * 0.235)
    const mainWidth = visualArea.width - sideWidth * 2 - gap * 2

    slotMap.set(mainItem.id, {
      x: visualArea.x + sideWidth + gap,
      y: visualArea.y,
      width: mainWidth,
      height: heroHeight,
    })

    const sideAreaHeight = heroHeight
    const sideSlotHeight = (sideAreaHeight - gap) / 2
    sideItems.forEach((item, index) => {
      const isLeft = index < 2
      slotMap.set(item.id, {
        x: isLeft ? visualArea.x : visualArea.x + sideWidth + gap + mainWidth + gap,
        y: visualArea.y + (index % 2) * (sideSlotHeight + gap),
        width: sideWidth,
        height: sideSlotHeight,
      })
    })

    if (remainingItems.length) {
      setRowSlots(slotMap, remainingItems, {
        x: visualArea.x,
        y: visualArea.y + heroHeight + gap,
        width: visualArea.width,
        height: Math.max(140, visualArea.height - heroHeight - gap),
      }, gap, {
        preferredAspect: 1.65,
        preferredMinWidth: 280,
        maxColumns: maxVisualColumns,
      })
    }
  } else if (visualItems.length) {
    setRowSlots(slotMap, visualItems, visualArea, gap, {
      preferredAspect: mainItems.length ? 1.78 : 1.55,
      preferredMinWidth: isWide ? 320 : visualItems.length >= 16 ? 260 : 300,
      maxColumns: maxVisualColumns,
    })
  }

  if (decorativeItems.length) {
    const height = Math.min(72, Math.max(40, Math.round(page.height * 0.05)))
    setRowSlots(slotMap, decorativeItems, {
      x: margin,
      y: Math.max(margin, page.height - margin - height),
      width: contentWidth,
      height,
    }, Math.max(8, Math.round(gap * 0.5)), {
      preferredAspect: 5,
      preferredMinWidth: 260,
      maxColumns: isWide ? 8 : 5,
    })
  }

  return slotMap
}

const getResponsiveStylePatch = (
  component: BigScreenComponent,
  layout: BigScreenComponentLayout,
  role: LayoutRole,
): Record<string, unknown> => {
  const shortSide = Math.min(layout.width, layout.height)
  const chartLikeRoles: LayoutRole[] = ['chart', 'mainVisual']

  if (component.type === 'title') {
    return {
      fontSize: clamp(Math.round(layout.height * 0.42), 24, 44),
      lineHeight: 1.12,
      letterSpacing: 0,
    }
  }

  if (['singleText', 'multiText', 'datetime', 'date', 'time', 'weekday'].includes(component.type)) {
    return {
      fontSize: clamp(Math.round(layout.height * 0.26), 14, 30),
      lineHeight: 1.25,
      letterSpacing: 0,
    }
  }

  if (role === 'kpi' || ['metricCard', 'flipNumber'].includes(component.type)) {
    return {
      fontSize: clamp(Math.round(shortSide * 0.15), 14, 24),
      legendVisible: false,
      valueLabelVisible: false,
    }
  }

  if (chartLikeRoles.includes(role)) {
    const hasComfortableLegendSpace = layout.width >= 360 && layout.height >= 220
    const hasComfortableAxisSpace = layout.width >= 260 && layout.height >= 180
    const hasComfortableLabelSpace = layout.width >= 460 && layout.height >= 280

    return {
      legendVisible: hasComfortableLegendSpace ? Boolean(component.style.legendVisible ?? true) : false,
      valueLabelVisible: hasComfortableLabelSpace ? Boolean(component.style.valueLabelVisible) : false,
      xAxisVisible: hasComfortableAxisSpace ? Boolean(component.style.xAxisVisible ?? true) : false,
      yAxisVisible: hasComfortableAxisSpace ? Boolean(component.style.yAxisVisible ?? true) : false,
    }
  }

  return {}
}

const buildMobileSlots = (
  page: BigScreenPage,
  items: LayoutItem[],
  margin: number,
  gap: number,
): Map<string, LayoutSlot> => {
  const slotMap = new Map<string, LayoutSlot>()
  let cursorY = margin

  items.forEach((item) => {
    const height = getPreferredHeight(item, page, 'mobile')
    slotMap.set(item.id, {
      x: margin,
      y: cursorY,
      width: page.width - margin * 2,
      height,
    })
    cursorY += height + gap
  })

  return slotMap
}

const applySlotToItem = (
  item: LayoutItem,
  slot: LayoutSlot,
  page: BigScreenPage,
  gridSize: number,
): BigScreenComponent[] => {
  const bounds = item.bounds
  const scale = Math.min(slot.width / bounds.width, slot.height / bounds.height)

  return item.components.map((component) => {
    const relativeX = component.layout.x - bounds.x
    const relativeY = component.layout.y - bounds.y
    const layout: BigScreenComponentLayout = item.components.length === 1
      ? {
          ...component.layout,
          x: snap(slot.x, gridSize),
          y: snap(slot.y, gridSize),
          width: Math.max(32, snap(slot.width, gridSize)),
          height: Math.max(32, snap(slot.height, gridSize)),
          rotate: 0,
        }
      : {
          ...component.layout,
          x: snap(slot.x + relativeX * scale, gridSize),
          y: snap(slot.y + relativeY * scale, gridSize),
          width: Math.max(32, snap(component.layout.width * scale, gridSize)),
          height: Math.max(32, snap(component.layout.height * scale, gridSize)),
          rotate: 0,
        }
    const boundedLayout = {
      ...layout,
      x: Math.max(0, Math.min(page.width - layout.width, layout.x)),
      y: Math.max(0, Math.min(page.height - layout.height, layout.y)),
    }
    const role = inferLayoutRole(component)

    return {
      ...component,
      layout: boundedLayout,
      style: {
        ...component.style,
        ...getResponsiveStylePatch(component, boundedLayout, role),
      },
      updatedAt: new Date().toISOString(),
    }
  })
}

const detectLayoutIssues = (
  page: BigScreenPage,
  components: BigScreenComponent[],
): BigScreenLayoutIssue[] => {
  const issues: BigScreenLayoutIssue[] = []
  const visible = components.filter((component) => component.pageId === page.id && component.visible)
  const totalArea = visible.reduce((sum, component) => sum + component.layout.width * component.layout.height, 0)

  if (visible.length === 0) {
    issues.push(createIssue('no-components', `页面「${page.name}」暂无组件`, { pageId: page.id, severity: 'warning' }))
  }

  if (totalArea / Math.max(1, page.width * page.height) > 0.75) {
    issues.push(createIssue('layout-density-high', `页面「${page.name}」信息密度较高`, { pageId: page.id, severity: 'warning' }))
  }

  const overlapCandidates = visible.filter((component) => !isDecorativeComponent(component))

  visible.forEach((component) => {
    const outOfBounds = component.layout.x < 0
      || component.layout.y < 0
      || component.layout.x + component.layout.width > page.width
      || component.layout.y + component.layout.height > page.height
    if (outOfBounds) {
      issues.push(createIssue('component-out-of-bounds', `组件「${component.name}」超出画布`, {
        pageId: page.id,
        componentId: component.id,
        severity: 'error',
      }))
    }

    if (component.layout.width < 80 || component.layout.height < 48) {
      issues.push(createIssue('component-too-small', `组件「${component.name}」尺寸过小`, {
        pageId: page.id,
        componentId: component.id,
        severity: 'warning',
      }))
    }

  })

  overlapCandidates.forEach((component, index) => {
    overlapCandidates.slice(index + 1).forEach((next) => {
      const separated = component.layout.x + component.layout.width <= next.layout.x
        || next.layout.x + next.layout.width <= component.layout.x
        || component.layout.y + component.layout.height <= next.layout.y
        || next.layout.y + next.layout.height <= component.layout.y

      if (!separated) {
        issues.push(createIssue('component-overlap', `组件「${component.name}」与「${next.name}」存在重叠`, {
          pageId: page.id,
          componentId: component.id,
          severity: 'warning',
        }))
      }
    })
  })

  return issues
}

export const applyBigScreenAutoLayout = (
  snapshot: BigScreenSnapshot,
  options: BigScreenAutoLayoutOptions,
): BigScreenAutoLayoutResult => {
  const nextSnapshot = clone(snapshot)
  const page = nextSnapshot.pages.find((item) => item.id === options.pageId)
  const issues: BigScreenLayoutIssue[] = []
  const movedComponentIds: string[] = []
  const skippedComponentIds: string[] = []

  if (!page) {
    return { snapshot: nextSnapshot, movedComponentIds, skippedComponentIds, issues }
  }

  const gridSize = Math.max(1, options.gridSize ?? 8)
  const margin = options.margin ?? (options.mode === 'mobile' ? 16 : Math.max(32, Math.round(page.width * 0.03)))
  const gap = options.gap ?? (options.mode === 'mobile' ? 12 : 24)
  const selectedComponentIds = new Set(options.selectedComponentIds ?? [])
  const pageComponents = nextSnapshot.components.filter((component) => component.pageId === page.id)
  const items = buildLayoutItems(pageComponents, selectedComponentIds, options.mode)
    .sort((left, right) => roleOrder[left.role] - roleOrder[right.role] || left.bounds.y - right.bounds.y || left.bounds.x - right.bounds.x)

  if (!items.length) {
    issues.push(createIssue('no-components', `页面「${page.name}」暂无可优化组件`, { pageId: page.id, severity: 'warning' }))
    return { snapshot: nextSnapshot, movedComponentIds, skippedComponentIds, issues }
  }

  const slotMap = options.mode === 'mobile'
    ? buildMobileSlots(page, items, margin, gap)
    : buildDesktopSlots(page, items, margin, gap)
  const changedComponents = new Map<string, BigScreenComponent>()

  items.forEach((item) => {
    if (item.locked) {
      skippedComponentIds.push(...item.components.map((component) => component.id))
      issues.push(createIssue('component-locked', `已跳过锁定组件组「${item.components[0]?.name ?? item.id}」`, {
        pageId: page.id,
        componentId: item.components[0]?.id,
      }))
      return
    }

    const slot = slotMap.get(item.id)
    if (!slot) {
      return
    }

    applySlotToItem(item, slot, page, gridSize).forEach((component) => {
      changedComponents.set(component.id, component)
      movedComponentIds.push(component.id)
    })
  })

  nextSnapshot.components = nextSnapshot.components.map((component) => changedComponents.get(component.id) ?? component)
  issues.push(...movedComponentIds.map((componentId) =>
    createIssue('component-moved', '组件已完成自动布局', {
      pageId: page.id,
      componentId,
    }),
  ))
  issues.push(...detectLayoutIssues(page, nextSnapshot.components))

  return {
    snapshot: nextSnapshot,
    movedComponentIds,
    skippedComponentIds,
    issues,
  }
}

export const snapBigScreenComponentsToGrid = (
  snapshot: BigScreenSnapshot,
  pageId: string,
  componentIds: string[],
  gridSize = 8,
): BigScreenAutoLayoutResult => {
  const nextSnapshot = clone(snapshot)
  const page = nextSnapshot.pages.find((item) => item.id === pageId)
  const ids = new Set(componentIds)
  const movedComponentIds: string[] = []
  const skippedComponentIds: string[] = []

  if (!page) {
    return { snapshot: nextSnapshot, movedComponentIds, skippedComponentIds, issues: [] }
  }

  nextSnapshot.components = nextSnapshot.components.map((component) => {
    if (component.pageId !== pageId || !ids.has(component.id)) {
      return component
    }

    if (component.locked) {
      skippedComponentIds.push(component.id)
      return component
    }

    movedComponentIds.push(component.id)
    return {
      ...component,
      layout: {
        ...component.layout,
        x: Math.max(0, Math.min(page.width - component.layout.width, snap(component.layout.x, gridSize))),
        y: Math.max(0, Math.min(page.height - component.layout.height, snap(component.layout.y, gridSize))),
        width: Math.max(1, snap(component.layout.width, gridSize)),
        height: Math.max(1, snap(component.layout.height, gridSize)),
      },
      updatedAt: new Date().toISOString(),
    }
  })

  return {
    snapshot: nextSnapshot,
    movedComponentIds,
    skippedComponentIds,
    issues: detectLayoutIssues(page, nextSnapshot.components),
  }
}
