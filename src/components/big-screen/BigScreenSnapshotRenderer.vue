<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import dayjs from 'dayjs'
import BigScreenChartRenderer from './BigScreenChartRenderer.vue'
import BigScreenThreeDRenderer from './BigScreenThreeDRenderer.vue'
import { chartComponentTypes } from './chartComponentRegistry'
import { getComponentDataRows, resolveFieldName } from './dataEngine'
import { threeDComponentTypes } from './threeDComponentRegistry'
import type {
  BigScreenComponent,
  BigScreenFilterConfig,
  BigScreenInteractionCondition,
  BigScreenPage,
  BigScreenSnapshot,
} from '@/types/bigScreen'

const props = withDefaults(
  defineProps<{
    snapshot: BigScreenSnapshot
    pageId?: string
    showPageName?: boolean
  }>(),
  {
    pageId: undefined,
    showPageName: false,
  },
)

const now = ref(dayjs())
const runtimePageId = ref(props.pageId ?? props.snapshot.homePageId)
const runtimeStylePatches = ref<Record<string, Record<string, unknown>>>({})
const runtimeVariables = ref<Record<string, unknown>>({})
const runtimeFilters = ref<Record<string, BigScreenFilterConfig[]>>({})
const refreshTick = ref(0)
const autoTick = ref(0)
const pageElement = ref<HTMLElement | null>(null)
const renderedPageWidth = ref(0)
const exitingComponentIds = ref<Set<string>>(new Set())
let timer: number | undefined
let pageSwitchToken = 0
let pageResizeObserver: ResizeObserver | undefined

const timeComponentTypes = new Set(['datetime', 'date', 'time', 'weekday'])

const activePage = computed<BigScreenPage>(() => {
  const targetPage = props.snapshot.pages.find((page) => page.id === runtimePageId.value)
  const homePage = props.snapshot.pages.find((page) => page.id === props.snapshot.homePageId)
  const firstPage = props.snapshot.pages[0]

  if (!firstPage) {
    throw new Error('数字大屏至少需要一个页面')
  }

  return targetPage ?? homePage ?? firstPage
})

const activeComponents = computed(() =>
  props.snapshot.components
    .filter((component) => component.pageId === activePage.value.id && component.visible)
    .sort((left, right) => left.zIndex - right.zIndex),
)

const pageStyle = computed<CSSProperties>(() => {
  const page = activePage.value
  const background = page.background
  const style: CSSProperties = {
    aspectRatio: `${page.width} / ${page.height}`,
    backgroundColor: background.color ?? '#08111f',
  }

  if (background.imageUrl) {
    style.backgroundImage = `url(${background.imageUrl})`
    style.backgroundSize = background.imageFit === 'stretch' ? '100% 100%' : background.imageFit ?? 'cover'
    style.backgroundRepeat = background.imageFit === 'repeat' ? 'repeat' : 'no-repeat'
    style.backgroundPosition = 'center'
  }

  return style
})

const runtimeScale = computed(() => {
  const pageWidth = activePage.value.width
  const width = renderedPageWidth.value || pageWidth

  return Math.max(0.05, width / Math.max(1, pageWidth))
})

const rendererStyle = computed<CSSProperties>(() => ({
  '--screen-ratio': String(activePage.value.width / activePage.value.height),
  '--runtime-scale': String(runtimeScale.value),
} as CSSProperties))

const scaledNumber = (value: unknown, fallback: number): number =>
  Number(value ?? fallback) * runtimeScale.value

const getComponentStyle = (component: BigScreenComponent): CSSProperties => {
  const page = activePage.value
  const isExiting = exitingComponentIds.value.has(component.id)
  const runtimeAnimation = isExiting ? component.animations.exit : component.animations.enter
  const animationPhase = isExiting ? 'exit' : 'enter'
  const animationDurationMs = Math.max(0, Number(runtimeAnimation.durationMs))
  const animationDelayMs = Math.max(0, Number(runtimeAnimation.startTimeMs))
  const componentOpacity = component.layout.opacity / 100
  const componentTransform = `rotate(${component.layout.rotate}deg)`
  const animationName = runtimeAnimation.enabled && runtimeAnimation.type !== 'none' && animationDurationMs > 0
    ? `big-screen-${animationPhase}-${runtimeAnimation.type}`
    : undefined

  return {
    left: `${(component.layout.x / page.width) * 100}%`,
    top: `${(component.layout.y / page.height) * 100}%`,
    width: `${(component.layout.width / page.width) * 100}%`,
    height: `${(component.layout.height / page.height) * 100}%`,
    '--component-opacity': String(componentOpacity),
    '--component-transform': componentTransform,
    opacity: 'var(--component-opacity)' as CSSProperties['opacity'],
    transform: 'var(--component-transform)',
    animationName,
    animationDuration: animationName ? `${animationDurationMs}ms` : undefined,
    animationDelay: animationName ? `${animationDelayMs}ms` : undefined,
    animationTimingFunction: animationName ? runtimeAnimation.easing : undefined,
    animationFillMode: animationName ? 'both' : undefined,
    zIndex: component.zIndex,
    overflow: component.layout.overflowHidden ? 'hidden' : 'visible',
  } as CSSProperties
}

const getMergedStyle = (component: BigScreenComponent): Record<string, unknown> => ({
  ...component.style,
  ...(runtimeStylePatches.value[component.id] ?? {}),
})

const getComponentById = (componentId: string): BigScreenComponent | undefined =>
  props.snapshot.components.find((component) => component.id === componentId)

const getComponentRows = (component: BigScreenComponent): Array<Record<string, unknown>> => {
  return getComponentDataRows(component, getRuntimeFilters(component))
}

const getTextStyle = (component: BigScreenComponent): CSSProperties => {
  const style = getMergedStyle(component)

  return {
    color: String(style.color ?? '#f8fafc'),
    fontSize: `${scaledNumber(style.fontSize, 22)}px`,
    fontWeight: Number(style.fontWeight ?? 500),
    lineHeight: Number(style.lineHeight ?? 1.2),
    textAlign: String(style.textAlign ?? 'left') as CSSProperties['textAlign'],
    letterSpacing: `${scaledNumber(style.letterSpacing, 0)}px`,
  }
}

const getShapeStyle = (component: BigScreenComponent): CSSProperties => {
  const style = getMergedStyle(component)

  return {
    background: String(style.backgroundColor ?? 'rgba(15, 47, 81, 0.7)'),
    border: `${scaledNumber(style.borderWidth, 1)}px solid ${String(style.borderColor ?? '#1d9bf0')}`,
    borderRadius: component.type === 'circle' ? '50%' : `${scaledNumber(style.borderRadius, 8)}px`,
    boxShadow: String(style.shadow ?? 'none'),
  }
}

const getMediaBoxStyle = (component: BigScreenComponent): CSSProperties => ({
  borderColor: String(getMergedStyle(component).borderColor ?? '#38bdf8'),
  color: String(getMergedStyle(component).color ?? '#dbeafe'),
})

const getImageStyle = (component: BigScreenComponent): CSSProperties => ({
  objectFit: String(getMergedStyle(component).objectFit ?? 'cover') as CSSProperties['objectFit'],
})

const getTimeText = (component: BigScreenComponent): string => {
  if (component.type === 'weekday') {
    return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.value.day()] ?? ''
  }

  return now.value.format(String(getMergedStyle(component).format ?? 'YYYY-MM-DD HH:mm:ss'))
}

const getOptions = (component: BigScreenComponent): Array<{ label: string, value: string }> => {
  const rows = getComponentRows(component)

  if (rows.length) {
    return rows.map((row) => ({
      label: String(row.label ?? row.name ?? row.title ?? row.value ?? '选项'),
      value: String(row.value ?? row.id ?? row.label ?? row.name ?? ''),
    }))
  }

  return Array.isArray(getMergedStyle(component).options)
    ? getMergedStyle(component).options as Array<{ label: string, value: string }>
    : []
}

const getPanels = (component: BigScreenComponent): Array<Record<string, string>> =>
  getComponentRows(component).length
    ? getComponentRows(component).map((row, index) => ({
        id: String(row.id ?? row.value ?? `panel-${index + 1}`),
        name: String(row.name ?? row.label ?? `Panel ${index + 1}`),
        title: String(row.title ?? row.name ?? row.label ?? `Panel ${index + 1}`),
        description: String(row.description ?? row.content ?? ''),
      }))
    : Array.isArray(getMergedStyle(component).panels)
      ? getMergedStyle(component).panels as Array<Record<string, string>>
      : []

const getSampleRows = (component: BigScreenComponent): Array<Record<string, string>> =>
  getComponentRows(component).length
    ? getComponentRows(component).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')])))
    : Array.isArray(getMergedStyle(component).sampleRows)
      ? getMergedStyle(component).sampleRows as Array<Record<string, string>>
      : []

const getRepeaterRows = (component: BigScreenComponent): Array<Record<string, string>> => {
  const style = getMergedStyle(component)
  const rows = getSampleRows(component)
  const pageSize = Math.max(1, Number((style.pageSize ?? rows.length) || 1))

  if (!style.paginationEnabled || rows.length <= pageSize) {
    return rows.slice(0, pageSize)
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.max(1, Math.min(pageCount, Number(style.currentPage ?? 1)))
  const startIndex = (currentPage - 1) * pageSize

  return rows.slice(startIndex, startIndex + pageSize)
}

const flattenTreeOptions = (component: BigScreenComponent): Array<{ label: string, value: string }> => {
  const rows = getComponentRows(component)
  if (rows.length) {
    return rows.map((row) => ({
      label: String(row.label ?? row.name ?? row.value ?? '节点'),
      value: String(row.value ?? row.id ?? row.label ?? ''),
    }))
  }

  const style = getMergedStyle(component)
  const treeData = Array.isArray(style.treeData)
    ? style.treeData as Array<{ label: string, value?: string, children?: Array<{ label: string, value?: string }> }>
    : []

  return treeData.flatMap((node) => [
    { label: node.label, value: String(node.value ?? node.label) },
    ...(node.children?.map((child) => ({ label: `${node.label} / ${child.label}`, value: String(child.value ?? child.label) })) ?? []),
  ])
}

const getControlRuntimeValue = (component: BigScreenComponent): unknown =>
  getMergedStyle(component).value

const getMultiControlRuntimeValue = (component: BigScreenComponent): string[] => {
  const value = getControlRuntimeValue(component)

  return Array.isArray(value) ? value.map(String) : value ? [String(value)] : []
}

const getActivePanel = (component: BigScreenComponent): Record<string, string> | undefined => {
  const panels = getPanels(component)
  const style = getMergedStyle(component)
  const runtimePatch = runtimeStylePatches.value[component.id] ?? {}
  const configuredActiveId = component.type === 'tabs' ? style.activeTabId : style.activePanelId
  const runtimeActiveId = component.type === 'tabs' ? runtimePatch.activeTabId : runtimePatch.activePanelId
  const autoplay = component.type === 'tabs' ? Boolean(style.autoPlay) : Boolean(style.autoplay)
  const interval = Math.max(1, Number(style.intervalSeconds ?? 4))
  const activeId = runtimeActiveId || (autoplay && panels.length ? panels[Math.floor(autoTick.value / interval) % panels.length]?.id : configuredActiveId)

  return panels.find((panel) => panel.id === activeId) ?? panels[0]
}

const getFirstTextValue = (...values: unknown[]): string =>
  values.map((value) => String(value ?? '').trim()).find(Boolean) ?? ''

const getStreamUrl = (component: BigScreenComponent): string => {
  const rows = getComponentRows(component)
  const fieldName = resolveFieldName(component.dataBinding, ['videoUrl', 'streamUrl', 'url'], ['videoUrl', 'streamUrl', 'url'])
  const style = getMergedStyle(component)

  return getFirstTextValue(
    style.streamUrl,
    style.stylePanelUrl,
    rows[0]?.[fieldName],
    rows[0]?.videoUrl,
    rows[0]?.streamUrl,
    rows[0]?.url,
    component.dataBinding?.sourceId,
  )
}

const getStreamMimeType = (component: BigScreenComponent): string => {
  const streamType = String(getMergedStyle(component).streamType ?? 'hls').toLowerCase()

  if (streamType === 'flv') {
    return 'video/x-flv'
  }

  if (streamType === 'mp4') {
    return 'video/mp4'
  }

  return 'application/vnd.apple.mpegurl'
}

const isChartComponent = (component: BigScreenComponent): boolean => chartComponentTypes.has(component.type)

const isThreeDComponent = (component: BigScreenComponent): boolean => threeDComponentTypes.has(component.type)

const isTimeComponent = (component: BigScreenComponent): boolean => timeComponentTypes.has(component.type)

const getRuntimeFilters = (component: BigScreenComponent): BigScreenFilterConfig[] => [
  ...(runtimeFilters.value['*'] ?? []),
  ...(runtimeFilters.value[component.id] ?? []),
]

const compareConditionValue = (current: unknown, operator: string, expected: unknown): boolean => {
  const currentText = String(current ?? '')

  switch (operator) {
    case 'always':
      return true
    case 'eq':
      return current === expected
    case 'neq':
    case 'ne':
      return current !== expected
    case 'startsWith':
      return currentText.startsWith(String(expected ?? ''))
    case 'endsWith':
      return currentText.endsWith(String(expected ?? ''))
    case 'like':
    case 'contains':
      return currentText.includes(String(expected ?? ''))
    case 'notContains':
    case 'notLike':
    case 'not_contains':
      return !currentText.includes(String(expected ?? ''))
    case 'in':
      return Array.isArray(expected) ? expected.includes(current) : false
    case 'notIn':
    case 'not_in':
      return Array.isArray(expected) ? !expected.includes(current) : true
    case 'gt':
      return Number(current) > Number(expected)
    case 'gte':
      return Number(current) >= Number(expected)
    case 'lt':
      return Number(current) < Number(expected)
    case 'lte':
      return Number(current) <= Number(expected)
    case 'empty':
      return current === undefined || current === null || current === ''
    case 'not_empty':
      return !(current === undefined || current === null || current === '')
    default:
      return true
  }
}

const readConditionValue = (
  condition: BigScreenInteractionCondition,
  sourceComponent: BigScreenComponent,
  context: Record<string, unknown>,
): unknown => {
  const key = condition.key ?? 'value'

  if (condition.source === 'event') {
    return context[key]
  }

  if (condition.source === 'variable') {
    return runtimeVariables.value[key]
  }

  if (condition.source === 'component') {
    const targetComponent = getComponentById(condition.targetId ?? sourceComponent.id)
    return targetComponent ? getMergedStyle(targetComponent)[key] : undefined
  }

  return condition.value
}

const interactionConditionsMatched = (
  conditions: BigScreenInteractionCondition[] | undefined,
  sourceComponent: BigScreenComponent,
  context: Record<string, unknown>,
): boolean =>
  (conditions ?? []).filter((condition) => condition.enabled).every((condition) =>
    compareConditionValue(readConditionValue(condition, sourceComponent, context), condition.operator, condition.value),
  )

const resolveActionValue = (
  action: BigScreenComponent['interactions'][number]['actions'][number],
  sourceComponent: BigScreenComponent,
  context: Record<string, unknown>,
): unknown => {
  const valueSource = String(action.payload.valueSource ?? 'payload')

  if (valueSource === 'event') {
    return context[String(action.payload.eventKey ?? 'value')]
  }

  if (valueSource === 'source-component') {
    return getMergedStyle(sourceComponent)[String(action.payload.sourcePropertyName ?? 'value')]
  }

  if (valueSource === 'variable') {
    return runtimeVariables.value[String(action.payload.variableKey ?? action.payload.key ?? '')]
  }

  return action.payload.value
}

const applyRuntimeFilter = (
  action: BigScreenComponent['interactions'][number]['actions'][number],
  sourceComponent: BigScreenComponent,
  context: Record<string, unknown>,
): void => {
  const targetId = action.targetId ?? String(action.payload.targetId ?? action.payload.targetComponentId ?? '')
  const targetScope = String(action.payload.scope ?? 'target')
  const fieldName = String(action.payload.fieldName ?? action.payload.fieldId ?? 'category')
  const operation = String(action.payload.operation ?? 'replace')
  const value = resolveActionValue(action, sourceComponent, context)
  const shouldClearFilter = operation === 'clear' || value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)
  const filter: BigScreenFilterConfig = {
    fieldName,
    operator: String(action.payload.operator ?? 'eq') as BigScreenFilterConfig['operator'],
    value,
  }
  const targetIds = targetScope === 'all'
    ? ['*']
    : targetId
      ? [targetId]
      : props.snapshot.components.filter(isChartComponent).map((component) => component.id)

  const getFilterValueList = (nextValue: unknown): unknown[] => {
    if (Array.isArray(nextValue)) {
      return nextValue
    }

    return nextValue === undefined || nextValue === null || nextValue === '' ? [] : [nextValue]
  }

  runtimeFilters.value = targetIds.reduce<Record<string, BigScreenFilterConfig[]>>((nextFilters, id) => {
    const currentFilters = nextFilters[id] ?? []
    const existing = currentFilters.filter((item) => item.fieldName !== fieldName)
    const previousFilter = currentFilters.find((item) => item.fieldName === fieldName)

    if (shouldClearFilter) {
      if (existing.length) {
        nextFilters[id] = existing
      } else {
        delete nextFilters[id]
      }
      return nextFilters
    }

    if (operation === 'includeListAdd' || operation === 'excludeListAdd' || operation === 'includeListRemove' || operation === 'excludeListRemove') {
      const incomingValues = getFilterValueList(value).map(String)
      const previousValues = getFilterValueList(previousFilter?.value)
      const nextValues = operation.endsWith('Add')
        ? [...previousValues, ...getFilterValueList(value)].filter((item, index, values) =>
            values.findIndex((valueItem) => String(valueItem) === String(item)) === index,
          )
        : previousValues.filter((item) => !incomingValues.includes(String(item)))

      if (!nextValues.length) {
        if (existing.length) {
          nextFilters[id] = existing
        } else {
          delete nextFilters[id]
        }
        return nextFilters
      }

      nextFilters[id] = [
        ...existing,
        {
          fieldName,
          operator: operation.startsWith('exclude') ? 'not_in' : 'in',
          value: nextValues,
        },
      ]
      return nextFilters
    }

    nextFilters[id] = [...existing, filter]
    return nextFilters
  }, { ...runtimeFilters.value })
}

const applyDrillState = (
  action: BigScreenComponent['interactions'][number]['actions'][number],
): void => {
  const targetId = action.targetId ?? String(action.payload.targetId ?? '')
  const targetComponent = targetId ? getComponentById(targetId) : undefined

  if (!targetComponent) {
    return
  }

  const style = getMergedStyle(targetComponent)
  const containerConfig = style.containerConfig as Record<string, unknown> | undefined
  const drill = containerConfig?.drill as Record<string, unknown> | undefined
  const region = String(action.payload.region ?? action.payload.value ?? '全国')

  runtimeStylePatches.value = {
    ...runtimeStylePatches.value,
    [targetId]: {
      ...(runtimeStylePatches.value[targetId] ?? {}),
      containerConfig: {
        ...(containerConfig ?? {}),
        drill: {
          ...(drill ?? {}),
          currentRegion: region,
          history: [...(Array.isArray(drill?.history) ? drill.history : []), region],
        },
      },
    },
  }
}

const getAnimationTotalMs = (component: BigScreenComponent, phase: 'enter' | 'exit'): number => {
  const animation = component.animations[phase]

  if (!animation.enabled || animation.type === 'none' || animation.durationMs <= 0) {
    return 0
  }

  return Math.max(0, Number(animation.startTimeMs)) + Math.max(0, Number(animation.durationMs))
}

const switchRuntimePage = async (nextPageId: string): Promise<void> => {
  if (!nextPageId || nextPageId === runtimePageId.value) {
    return
  }

  const token = pageSwitchToken + 1
  pageSwitchToken = token
  const exitComponents = activeComponents.value.filter((component) => getAnimationTotalMs(component, 'exit') > 0)

  if (!exitComponents.length) {
    runtimePageId.value = nextPageId
    return
  }

  exitingComponentIds.value = new Set(exitComponents.map((component) => component.id))
  const waitMs = Math.max(...exitComponents.map((component) => getAnimationTotalMs(component, 'exit')))
  await new Promise((resolve) => window.setTimeout(resolve, waitMs))

  if (pageSwitchToken === token) {
    runtimePageId.value = nextPageId
    exitingComponentIds.value = new Set()
  }
}

const runInteractionAction = async (
  action: BigScreenComponent['interactions'][number]['actions'][number],
  sourceComponent: BigScreenComponent,
  context: Record<string, unknown>,
): Promise<void> => {
  const targetId = action.targetId ?? String(action.payload.targetId ?? '')

  if (action.type === 'wait') {
    await new Promise((resolve) => window.setTimeout(resolve, Number(action.payload.durationMs ?? 300)))
    return
  }

  if (action.type === 'open-link') {
    const url = String(action.payload.url ?? '')
    if (url) {
      window.open(url, String(action.payload.target ?? '_blank'))
    }
    return
  }

  if (action.type === 'switch-page') {
    await switchRuntimePage(targetId || String(action.payload.pageId ?? runtimePageId.value))
    return
  }

  if (action.type === 'set-element-property' && targetId) {
    runtimeStylePatches.value = {
      ...runtimeStylePatches.value,
      [targetId]: {
        ...(runtimeStylePatches.value[targetId] ?? {}),
        [String(action.payload.propertyName ?? 'text')]: resolveActionValue(action, sourceComponent, context),
      },
    }
    return
  }

  if ((action.type === 'switch-panel-state' || action.type === 'change-carousel-state') && targetId) {
    const targetComponent = getComponentById(targetId)
    const panels = targetComponent ? getPanels(targetComponent) : []
    const activePanel = targetComponent ? getActivePanel(targetComponent) : undefined
    const currentIndex = Math.max(0, panels.findIndex((panel) => panel.id === activePanel?.id))
    const mode = String(action.payload.mode ?? 'set')
    const nextPanelId = mode === 'next'
      ? panels[(currentIndex + 1) % Math.max(1, panels.length)]?.id
      : mode === 'prev'
        ? panels[(currentIndex - 1 + panels.length) % Math.max(1, panels.length)]?.id
        : String(action.payload.panelId ?? panels[0]?.id ?? '')

    runtimeStylePatches.value = {
      ...runtimeStylePatches.value,
      [targetId]: {
        ...(runtimeStylePatches.value[targetId] ?? {}),
        activePanelId: nextPanelId,
        activeTabId: nextPanelId,
      },
    }
    return
  }

  if (action.type === 'set-filter') {
    applyRuntimeFilter(action, sourceComponent, context)
    return
  }

  if (action.type === 'gis-drill') {
    applyDrillState(action)
    return
  }

  if (action.type === 'set-variable') {
    runtimeVariables.value = {
      ...runtimeVariables.value,
      [String(action.payload.key ?? targetId)]: resolveActionValue(action, sourceComponent, context),
    }
    return
  }

  if (action.type === 'refresh-data' || action.type === 'refresh-all-visuals') {
    refreshTick.value += 1
    return
  }

  if (action.type === 'emit-event' && targetId) {
    const targetComponent = getComponentById(targetId)
    if (targetComponent) {
      await triggerInteraction(targetComponent, 'custom', undefined, {
        ...context,
        eventName: action.payload.eventName,
        sourceComponentId: sourceComponent.id,
      })
    }
  }
}

const triggerInteraction = async (
  component: BigScreenComponent,
  trigger: BigScreenComponent['interactions'][number]['trigger'],
  event?: MouseEvent,
  context: Record<string, unknown> = {},
): Promise<void> => {
  const interactions = component.interactions.filter((interaction) => interaction.enabled && interaction.trigger === trigger)

  if (!interactions.length) {
    return
  }

  event?.stopPropagation()

  for (const interaction of interactions) {
    if (!interactionConditionsMatched(interaction.conditions, component, context)) {
      continue
    }
    for (const action of interaction.actions) {
      await runInteractionAction(action, component, context)
    }
  }
}

const triggerActivePageLifecycle = async (): Promise<void> => {
  const pageId = activePage.value.id
  const components = [...activeComponents.value]

  for (const component of components) {
    await triggerInteraction(component, 'page-load', undefined, { pageId, sourceComponentId: component.id })
  }

  for (const component of components.filter((item) => Boolean(item.dataBinding) && !isTimeComponent(item))) {
    const rows = getComponentRows(component)

    await triggerInteraction(component, 'data-loaded', undefined, {
      pageId,
      rows,
      rowCount: rows.length,
      sourceComponentId: component.id,
      sourceType: component.dataBinding?.sourceType,
    })
  }
}

const handleChartClick = async (component: BigScreenComponent, payload: Record<string, unknown>): Promise<void> => {
  await triggerInteraction(component, 'click', undefined, {
    ...payload,
    value: payload.name ?? payload.value,
    chartPayload: payload,
  })
}

const handleControlChange = async (component: BigScreenComponent, value: unknown): Promise<void> => {
  runtimeStylePatches.value = {
    ...runtimeStylePatches.value,
    [component.id]: {
      ...(runtimeStylePatches.value[component.id] ?? {}),
      value,
    },
  }

  await triggerInteraction(component, 'change', undefined, {
    value,
    sourceComponentId: component.id,
  })
}

const handleMultiControlChange = async (component: BigScreenComponent, event: Event): Promise<void> => {
  const select = event.target as HTMLSelectElement
  const value = Array.from(select.selectedOptions).map((option) => option.value)
  await handleControlChange(component, value)
}

const activatePanel = async (component: BigScreenComponent, panelId: string): Promise<void> => {
  runtimeStylePatches.value = {
    ...runtimeStylePatches.value,
    [component.id]: {
      ...(runtimeStylePatches.value[component.id] ?? {}),
      activePanelId: panelId,
      activeTabId: panelId,
    },
  }

  await triggerInteraction(component, 'change', undefined, {
    value: panelId,
    panelId,
    sourceComponentId: component.id,
  })
}

const updateRenderedPageWidth = (): void => {
  renderedPageWidth.value = pageElement.value?.getBoundingClientRect().width ?? 0
}

const observeRenderedPage = (): void => {
  pageResizeObserver?.disconnect()

  if (!pageElement.value) {
    updateRenderedPageWidth()
    return
  }

  updateRenderedPageWidth()

  if (typeof ResizeObserver !== 'undefined') {
    pageResizeObserver = new ResizeObserver(updateRenderedPageWidth)
    pageResizeObserver.observe(pageElement.value)
  }
}

watch(
  () => [props.pageId, props.snapshot.homePageId],
  () => {
    runtimePageId.value = props.pageId ?? props.snapshot.homePageId
  },
)

watch(
  () => activePage.value.id,
  async () => {
    await nextTick()
    observeRenderedPage()
    await triggerActivePageLifecycle()
  },
)

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = dayjs()
    autoTick.value += 1
  }, 1000)
  window.addEventListener('resize', updateRenderedPageWidth)
  void nextTick(() => {
    observeRenderedPage()
    void triggerActivePageLifecycle()
  })
})

onBeforeUnmount(() => {
  pageSwitchToken += 1
  if (timer) {
    window.clearInterval(timer)
  }
  pageResizeObserver?.disconnect()
  window.removeEventListener('resize', updateRenderedPageWidth)
})
</script>

<template>
  <div class="snapshot-renderer" :style="rendererStyle">
    <div v-if="showPageName" class="page-name">{{ activePage.name }}</div>
    <div ref="pageElement" class="screen-page" :style="pageStyle">
      <div
        v-for="component in activeComponents"
        :key="`${component.id}-${refreshTick}`"
        class="screen-component"
        :class="`type-${component.type}`"
        :style="getComponentStyle(component)"
        @click="triggerInteraction(component, 'click', $event)"
        @dblclick="triggerInteraction(component, 'double-click', $event)"
        @mouseenter="triggerInteraction(component, 'mouseenter', $event)"
        @mouseleave="triggerInteraction(component, 'mouseleave', $event)"
      >
        <template v-if="['title', 'singleText', 'multiText'].includes(component.type)">
          <div class="text-component" :style="getTextStyle(component)">
            {{ getMergedStyle(component).text ?? component.name }}
          </div>
        </template>

        <template v-else-if="component.type === 'rectangle' || component.type === 'circle'">
          <div class="shape-component" :style="getShapeStyle(component)" />
        </template>

        <template v-else-if="component.type === 'image' && getMergedStyle(component).imageUrl">
          <img
            class="image-component"
            :style="getImageStyle(component)"
            :src="String(getMergedStyle(component).imageUrl ?? '')"
            :alt="component.name"
          >
        </template>

        <template v-else-if="component.type === 'image'">
          <div class="media-component" :style="getMediaBoxStyle(component)">
            {{ component.style.placeholderText ?? '图片占位' }}
          </div>
        </template>

        <template v-else-if="component.type === 'video'">
          <video
            v-if="getMergedStyle(component).videoUrl"
            class="video-component"
            :src="String(getMergedStyle(component).videoUrl)"
            :poster="String(getMergedStyle(component).posterUrl ?? '')"
            :controls="Boolean(getMergedStyle(component).controls)"
            :autoplay="Boolean(getMergedStyle(component).autoplay)"
            :loop="Boolean(getMergedStyle(component).loop)"
            :muted="Boolean(getMergedStyle(component).muted)"
          />
          <div v-else class="media-component" :style="getMediaBoxStyle(component)">普通视频 URL 未配置</div>
        </template>

        <template v-else-if="component.type === 'videoStream'">
          <div v-if="getStreamUrl(component)" class="video-stream-player">
            <video
              class="video-component"
              :controls="Boolean(getMergedStyle(component).controls)"
              :autoplay="Boolean(getMergedStyle(component).autoplay)"
              :loop="Boolean(getMergedStyle(component).loop)"
              :muted="Boolean(getMergedStyle(component).muted ?? true)"
              playsinline
              preload="metadata"
            >
              <source :src="getStreamUrl(component)" :type="getStreamMimeType(component)">
              {{ getMergedStyle(component).errorText ?? '浏览器不支持当前视频流格式' }}
            </video>
            <span v-if="getMergedStyle(component).streamType === 'flv'" class="stream-format-note">FLV</span>
          </div>
          <div v-else class="stream-component" :style="getMediaBoxStyle(component)">
            <strong>{{ component.name }}</strong>
            <span>{{ getMergedStyle(component).streamType === 'flv' ? 'FLV' : 'HLS' }} · {{ getMergedStyle(component).errorText }}</span>
            <small>断流重连 {{ getMergedStyle(component).reconnectEnabled ? '开启' : '关闭' }} · 隐藏卸载 {{ getMergedStyle(component).hiddenUnmount ? '开启' : '关闭' }}</small>
          </div>
        </template>

        <template v-else-if="component.type === 'iframe'">
          <iframe
            class="iframe-component"
            :src="String(getMergedStyle(component).url ?? 'about:blank')"
            :sandbox="String(getMergedStyle(component).sandbox ?? 'allow-scripts allow-same-origin allow-forms')"
          />
        </template>

        <template v-else-if="component.type === 'hotspot'">
          <button class="hotspot-component" type="button">
            {{ getMergedStyle(component).actionLabel ?? '点击热区' }}
          </button>
        </template>

        <template v-else-if="['datetime', 'date', 'time', 'weekday'].includes(component.type)">
          <div class="text-component" :style="getTextStyle(component)">
            {{ getTimeText(component) }}
          </div>
        </template>

        <template v-else-if="component.type === 'repeater'">
          <div class="repeater-component">
            <div
              v-for="(row, index) in getRepeaterRows(component)"
              :key="`${component.id}-${index}`"
              class="repeater-item"
              :style="{ borderColor: String(getMergedStyle(component).itemBorderColor ?? '#38bdf8'), background: String(getMergedStyle(component).itemBackground ?? 'rgba(15, 47, 81, 0.72)') }"
            >
              <strong>{{ row.title ?? `数据项${index + 1}` }}</strong>
              <span>{{ row.value ?? '--' }}</span>
              <small>{{ row.status ?? '' }}</small>
            </div>
          </div>
        </template>

        <template v-else-if="component.type === 'carousel'">
          <div class="carousel-component">
            <strong>{{ getActivePanel(component)?.title ?? 'Panel' }}</strong>
            <span>{{ getActivePanel(component)?.description ?? getActivePanel(component)?.name }}</span>
            <div v-if="getMergedStyle(component).indicatorVisible" class="indicator-row">
              <button
                v-for="panel in getPanels(component)"
                :key="panel.id"
                type="button"
                :class="{ active: panel.id === getActivePanel(component)?.id }"
                @click.stop="activatePanel(component, String(panel.id))"
              />
            </div>
          </div>
        </template>

        <template v-else-if="component.type === 'tabs'">
          <div class="tabs-component">
            <div v-if="getMergedStyle(component).headerVisible" class="tabs-header">
              <button
                v-for="panel in getPanels(component)"
                :key="panel.id"
                type="button"
                :class="{ active: panel.id === getActivePanel(component)?.id }"
                @click.stop="activatePanel(component, String(panel.id))"
              >
                {{ panel.name }}
              </button>
            </div>
            <div class="tabs-body">{{ getActivePanel(component)?.title ?? '标签页内容' }}</div>
          </div>
        </template>

        <template v-else-if="['select', 'multiSelect', 'treeSelect', 'treeMultiSelect', 'datePicker'].includes(component.type)">
          <div class="control-component" :style="getMediaBoxStyle(component)">
            <span>{{ getMergedStyle(component).placeholder ?? component.name }}</span>
            <select
              v-if="component.type === 'select'"
              :value="String(getControlRuntimeValue(component) ?? '')"
              @change.stop="handleControlChange(component, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="option in getOptions(component)" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <select
              v-else-if="component.type === 'multiSelect'"
              multiple
              @change.stop="handleMultiControlChange(component, $event)"
            >
              <option
                v-for="option in getOptions(component)"
                :key="option.value"
                :value="option.value"
                :selected="getMultiControlRuntimeValue(component).includes(option.value)"
              >
                {{ option.label }}
              </option>
            </select>
            <select
              v-else-if="component.type === 'treeSelect'"
              :value="String(getControlRuntimeValue(component) ?? '')"
              @change.stop="handleControlChange(component, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="option in flattenTreeOptions(component)" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <select
              v-else-if="component.type === 'treeMultiSelect'"
              multiple
              @change.stop="handleMultiControlChange(component, $event)"
            >
              <option
                v-for="option in flattenTreeOptions(component)"
                :key="option.value"
                :value="option.value"
                :selected="getMultiControlRuntimeValue(component).includes(option.value)"
              >
                {{ option.label }}
              </option>
            </select>
            <input
              v-else
              type="date"
              :value="String(getControlRuntimeValue(component) ?? '')"
              :min="String(getMergedStyle(component).minDate ?? '')"
              :max="String(getMergedStyle(component).maxDate ?? '')"
              @change.stop="handleControlChange(component, ($event.target as HTMLInputElement).value)"
            >
          </div>
        </template>

        <template v-else-if="isChartComponent(component)">
          <BigScreenChartRenderer :component="component" :scale="runtimeScale" :runtime-filters="getRuntimeFilters(component)" @chart-click="handleChartClick(component, $event)" />
        </template>

        <template v-else-if="isThreeDComponent(component)">
          <BigScreenThreeDRenderer :component="component" />
        </template>

        <template v-else>
          <div class="fallback-component">
            <div>{{ component.name }}</div>
            <span>{{ component.type }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.snapshot-renderer {
  width: 100%;
}

.page-name {
  margin-bottom: calc(8px * var(--runtime-scale));
  color: #64748b;
  font-size: calc(13px * var(--runtime-scale));
}

.screen-page {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
}

.screen-component {
  position: absolute;
  transform-origin: center;
}

@keyframes big-screen-enter-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: var(--component-opacity);
  }
}

@keyframes big-screen-enter-scale {
  from {
    opacity: 0;
    transform: var(--component-transform) scale(0.86);
  }
  to {
    opacity: var(--component-opacity);
    transform: var(--component-transform);
  }
}

@keyframes big-screen-enter-fly {
  from {
    opacity: 0;
    transform: var(--component-transform) translate3d(24px, 0, 0);
  }
  to {
    opacity: var(--component-opacity);
    transform: var(--component-transform);
  }
}

@keyframes big-screen-enter-float {
  from {
    opacity: 0;
    transform: var(--component-transform) translate3d(0, 16px, 0);
  }
  to {
    opacity: var(--component-opacity);
    transform: var(--component-transform);
  }
}

@keyframes big-screen-enter-drawer {
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0);
  }
  to {
    opacity: var(--component-opacity);
    clip-path: inset(0 0 0 0);
  }
}

@keyframes big-screen-enter-scroll {
  from {
    opacity: 0;
    transform: var(--component-transform) rotateX(-28deg);
  }
  to {
    opacity: var(--component-opacity);
    transform: var(--component-transform);
  }
}

@keyframes big-screen-exit-fade {
  from {
    opacity: var(--component-opacity);
  }
  to {
    opacity: 0;
  }
}

@keyframes big-screen-exit-scale {
  from {
    opacity: var(--component-opacity);
    transform: var(--component-transform);
  }
  to {
    opacity: 0;
    transform: var(--component-transform) scale(0.86);
  }
}

@keyframes big-screen-exit-fly {
  from {
    opacity: var(--component-opacity);
    transform: var(--component-transform);
  }
  to {
    opacity: 0;
    transform: var(--component-transform) translate3d(-24px, 0, 0);
  }
}

@keyframes big-screen-exit-float {
  from {
    opacity: var(--component-opacity);
    transform: var(--component-transform);
  }
  to {
    opacity: 0;
    transform: var(--component-transform) translate3d(0, -16px, 0);
  }
}

@keyframes big-screen-exit-drawer {
  from {
    opacity: var(--component-opacity);
    clip-path: inset(0 0 0 0);
  }
  to {
    opacity: 0;
    clip-path: inset(0 0 0 100%);
  }
}

@keyframes big-screen-exit-scroll {
  from {
    opacity: var(--component-opacity);
    transform: var(--component-transform);
  }
  to {
    opacity: 0;
    transform: var(--component-transform) rotateX(28deg);
  }
}

.text-component {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  white-space: pre-wrap;
}

.shape-component,
.image-component,
.video-component,
.iframe-component {
  width: 100%;
  height: 100%;
}

.image-component {
  object-fit: cover;
  display: block;
}

.video-component,
.iframe-component {
  display: block;
  border: 0;
  background: #020617;
}

.video-stream-player {
  position: relative;
  width: 100%;
  height: 100%;
  background: #020617;
}

.video-stream-player .video-component {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.stream-format-note {
  position: absolute;
  right: calc(8px * var(--runtime-scale));
  bottom: calc(8px * var(--runtime-scale));
  padding: calc(2px * var(--runtime-scale)) calc(6px * var(--runtime-scale));
  border-radius: calc(4px * var(--runtime-scale));
  background: rgba(15, 23, 42, 0.78);
  color: #93c5fd;
  font-size: calc(11px * var(--runtime-scale));
}

.media-component,
.stream-component,
.control-component,
.carousel-component,
.tabs-component,
.repeater-component {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.media-component,
.stream-component,
.control-component,
.carousel-component {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(8px * var(--runtime-scale));
  border: 1px dashed;
  border-radius: calc(8px * var(--runtime-scale));
  background: rgba(15, 23, 42, 0.78);
  color: #dbeafe;
}

.stream-component small {
  color: #93c5fd;
}

.hotspot-component {
  width: 100%;
  height: 100%;
  border: 1px dashed #38bdf8;
  border-radius: calc(8px * var(--runtime-scale));
  background: transparent;
  color: transparent;
  cursor: pointer;
}

.repeater-component {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: calc(12px * var(--runtime-scale));
}

.repeater-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: calc(8px * var(--runtime-scale));
  min-width: 0;
  padding: calc(14px * var(--runtime-scale));
  border: 1px solid;
  border-radius: calc(8px * var(--runtime-scale));
  color: #e2e8f0;
}

.repeater-item span {
  font-size: calc(24px * var(--runtime-scale));
  font-weight: 700;
  color: #f8fafc;
}

.repeater-item small {
  color: #93c5fd;
}

.indicator-row {
  display: flex;
  gap: calc(6px * var(--runtime-scale));
  margin-top: calc(10px * var(--runtime-scale));
}

.indicator-row button {
  width: calc(7px * var(--runtime-scale));
  height: calc(7px * var(--runtime-scale));
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #64748b;
  cursor: pointer;
}

.indicator-row button.active {
  background: #38bdf8;
}

.tabs-component {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(56, 189, 248, 0.4);
  border-radius: calc(8px * var(--runtime-scale));
  background: rgba(15, 23, 42, 0.78);
  color: #e2e8f0;
}

.tabs-header {
  display: flex;
  background: rgba(15, 23, 42, 0.88);
}

.tabs-header button {
  padding: calc(10px * var(--runtime-scale)) calc(16px * var(--runtime-scale));
  border: 0;
  background: transparent;
  color: #94a3b8;
  font-size: calc(13px * var(--runtime-scale));
  cursor: pointer;
}

.tabs-header button.active {
  color: #38bdf8;
  box-shadow: inset 0 -2px 0 #38bdf8;
}

.tabs-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-component {
  align-items: flex-start;
  padding: calc(10px * var(--runtime-scale)) calc(14px * var(--runtime-scale));
  border-style: solid;
}

.control-component span {
  color: #94a3b8;
  font-size: calc(12px * var(--runtime-scale));
}

.control-component select,
.control-component input {
  width: 100%;
  min-height: calc(30px * var(--runtime-scale));
  box-sizing: border-box;
  border: 1px solid rgba(56, 189, 248, 0.45);
  border-radius: calc(6px * var(--runtime-scale));
  background: rgba(2, 6, 23, 0.68);
  color: #f8fafc;
  font-size: calc(13px * var(--runtime-scale));
}

.control-component select[multiple] {
  min-height: calc(68px * var(--runtime-scale));
}

.fallback-component {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(125, 211, 252, 0.6);
  border-radius: calc(8px * var(--runtime-scale));
  background: rgba(15, 23, 42, 0.72);
  color: #dbeafe;
  font-size: calc(16px * var(--runtime-scale));
}

.fallback-component span {
  margin-top: calc(6px * var(--runtime-scale));
  color: #93c5fd;
  font-size: calc(12px * var(--runtime-scale));
}
</style>
