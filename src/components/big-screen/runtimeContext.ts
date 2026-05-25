import type {
  BigScreenRuntimeContext,
  BigScreenRuntimePageOption,
  BigScreenRuntimeSource,
  BigScreenSnapshot,
} from '@/types/bigScreen'

export const getBigScreenRuntimePageOptions = (
  snapshot?: BigScreenSnapshot | null,
): BigScreenRuntimePageOption[] =>
  (snapshot?.pages ?? []).map((page) => ({
    label: page.name,
    value: page.id,
  }))

export const resolveBigScreenRuntimePageId = (
  snapshot?: BigScreenSnapshot | null,
  pageId?: string,
): string => {
  if (!snapshot) {
    return ''
  }

  const targetPage = snapshot.pages.find((page) => page.id === pageId)
  const homePage = snapshot.pages.find((page) => page.id === snapshot.homePageId)

  return targetPage?.id ?? homePage?.id ?? snapshot.pages[0]?.id ?? ''
}

export const createBigScreenRuntimeContext = (
  snapshot: BigScreenSnapshot,
  pageId?: string,
  source: BigScreenRuntimeSource = 'preview',
): BigScreenRuntimeContext => {
  const activePageId = resolveBigScreenRuntimePageId(snapshot, pageId)
  const activePage = snapshot.pages.find((page) => page.id === activePageId) ?? snapshot.pages[0]

  if (!activePage) {
    throw new Error('数字大屏至少需要一个页面')
  }

  return {
    source,
    snapshot,
    activePageId,
    activePage,
    pageOptions: getBigScreenRuntimePageOptions(snapshot),
    componentCount: snapshot.components.length,
    visibleComponentCount: snapshot.components.filter((component) => component.pageId === activePage.id && component.visible).length,
    variables: Object.fromEntries(snapshot.globalVariables.map((variable) => [variable.key, variable.value])),
    assets: Object.fromEntries(snapshot.assets.map((asset) => [asset.id, asset])),
    readonly: source !== 'editor',
  }
}
