import {
  createDashboardHeatmapResult,
  createDefaultHeatmapQuery,
  createHeatmapActionResult,
  createHeatmapFromPayload,
  createHeatmapResult,
  createSavedHeatmapResult,
  createShareHeatmapResult,
  filterHeatmaps,
  mockClickedUsers,
  mockHeatmapElements,
  mockHeatmapPageGroups,
  mockHeatmapPoints,
  mockHeatmapVersions,
  mockHeatmaps,
  mockPreview48h,
} from '@/mock/heatmapAnalysis'
import type {
  HeatmapActionResult,
  HeatmapClickPoint,
  HeatmapClickedUser,
  HeatmapCreatePayload,
  HeatmapDashboardPayload,
  HeatmapElementStat,
  HeatmapListFilter,
  HeatmapListItem,
  HeatmapPageGroup,
  HeatmapQueryConfig,
  HeatmapQueryResult,
  HeatmapSaveAnalysisPayload,
  HeatmapSharePayload,
  HeatmapVersion,
} from '@/types/heatmapAnalysis'

const MOCK_DELAY = 260

let heatmapStore: HeatmapListItem[] = mockHeatmaps.map((heatmap) => ({
  ...heatmap,
  analysisTypes: [...heatmap.analysisTypes],
  trend: heatmap.trend.map((point) => ({ ...point })),
  pageGroup: heatmap.pageGroup ? { ...heatmap.pageGroup } : undefined,
}))

let versionStore: HeatmapVersion[] = mockHeatmapVersions.map((version) => ({ ...version }))

const resolveMock = <T>(payload: T): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(payload), MOCK_DELAY)
  })

const cloneHeatmap = (heatmap: HeatmapListItem): HeatmapListItem => ({
  ...heatmap,
  analysisTypes: [...heatmap.analysisTypes],
  trend: heatmap.trend.map((point) => ({ ...point })),
  pageGroup: heatmap.pageGroup ? { ...heatmap.pageGroup } : undefined,
})

export const heatmapAnalysisService = {
  listHeatmaps: (filters: HeatmapListFilter): Promise<HeatmapListItem[]> =>
    resolveMock(filterHeatmaps(heatmapStore, filters).map(cloneHeatmap)),

  getDefaultQuery: (heatmapId?: string): Promise<HeatmapQueryConfig> => {
    const fallbackQuery = createDefaultHeatmapQuery()

    if (!heatmapId) {
      return resolveMock(fallbackQuery)
    }

    const heatmap = heatmapStore.find((item) => item.id === heatmapId)

    if (!heatmap) {
      return resolveMock(fallbackQuery)
    }

    const versions = versionStore.filter((version) => version.heatmapId === heatmap.id)
    const defaultVersion = versions.find((version) => version.isDefault && !version.archived) ?? versions[0]
    const comparisonVersion = versions.find((version) => version.id !== defaultVersion?.id && !version.archived) ?? defaultVersion

    return resolveMock({
      ...fallbackQuery,
      heatmapId: heatmap.id,
      versionId: defaultVersion?.id ?? heatmap.currentVersionId,
      comparison: {
        ...fallbackQuery.comparison,
        leftVersionId: comparisonVersion?.id ?? defaultVersion?.id ?? heatmap.currentVersionId,
        rightVersionId: defaultVersion?.id ?? heatmap.currentVersionId,
      },
    })
  },

  getPageGroups: (): Promise<HeatmapPageGroup[]> =>
    resolveMock(mockHeatmapPageGroups.map((group) => ({ ...group }))),

  getVersions: (heatmapId: string): Promise<HeatmapVersion[]> =>
    resolveMock(versionStore.filter((version) => version.heatmapId === heatmapId).map((version) => ({ ...version }))),

  getPreview48h: (): Promise<Array<{ hour: string, pv: number }>> =>
    resolveMock(mockPreview48h.map((point) => ({ ...point }))),

  queryHeatmap: (query: HeatmapQueryConfig): Promise<HeatmapQueryResult> =>
    resolveMock(createHeatmapResult(heatmapStore, versionStore, query)),

  createHeatmap: (payload: HeatmapCreatePayload): Promise<{ heatmap: HeatmapListItem, query: HeatmapQueryConfig }> => {
    const created = createHeatmapFromPayload(payload, heatmapStore.length + 1)
    heatmapStore = [created.heatmap, ...heatmapStore]
    versionStore = [created.version, ...versionStore]
    const createdQuery = createDefaultHeatmapQuery()
    createdQuery.heatmapId = created.heatmap.id
    createdQuery.versionId = created.version.id
    createdQuery.comparison.leftVersionId = created.version.id
    createdQuery.comparison.rightVersionId = created.version.id

    return resolveMock({
      heatmap: cloneHeatmap(created.heatmap),
      query: createdQuery,
    })
  },

  copyHeatmap: (heatmapId: string): Promise<HeatmapActionResult> => {
    const source = heatmapStore.find((heatmap) => heatmap.id === heatmapId)

    if (!source) {
      return resolveMock({
        success: false,
        id: '',
        message: '未找到要复制的热力图。',
      })
    }

    const copyId = `hm_copy_${Date.now()}`
    const copiedHeatmap: HeatmapListItem = {
      ...cloneHeatmap(source),
      id: copyId,
      name: `${source.name} - 副本`,
      createdAt: '2026-05-21 10:40:00',
      updatedAt: '2026-05-21 10:40:00',
      dashboardReferenced: false,
    }
    const copiedVersions = versionStore
      .filter((version) => version.heatmapId === heatmapId)
      .map((version, index) => ({
        ...version,
        id: `hv_copy_${Date.now()}_${index}`,
        heatmapId: copyId,
      }))
    copiedHeatmap.currentVersionId = copiedVersions.find((version) => version.isDefault)?.id ?? copiedVersions[0]?.id ?? copiedHeatmap.currentVersionId
    heatmapStore = [copiedHeatmap, ...heatmapStore]
    versionStore = [...copiedVersions, ...versionStore]

    return resolveMock(createHeatmapActionResult('热力图已复制。', 'heatmap_copy'))
  },

  renameHeatmap: (heatmapId: string, name: string): Promise<HeatmapActionResult> => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return resolveMock({
        success: false,
        id: heatmapId,
        message: '热力图名称不能为空。',
      })
    }

    heatmapStore = heatmapStore.map((heatmap) =>
      heatmap.id === heatmapId
        ? { ...heatmap, name: trimmedName, updatedAt: '2026-05-21 11:45:00' }
        : heatmap,
    )

    return resolveMock(createHeatmapActionResult('热力图名称已更新。', 'heatmap_rename'))
  },

  deleteHeatmap: (heatmapId: string): Promise<HeatmapActionResult> => {
    heatmapStore = heatmapStore.map((heatmap) =>
      heatmap.id === heatmapId ? { ...heatmap, status: 'deleted' } : heatmap,
    )
    return resolveMock(createHeatmapActionResult('热力图已删除，原始埋点数据不会删除。', 'heatmap_delete'))
  },

  setDefaultVersion: (heatmapId: string, versionId: string): Promise<HeatmapActionResult> => {
    versionStore = versionStore.map((version) => version.heatmapId === heatmapId
      ? { ...version, isDefault: version.id === versionId }
      : version)
    heatmapStore = heatmapStore.map((heatmap) => heatmap.id === heatmapId
      ? {
          ...heatmap,
          currentVersionId: versionId,
          currentVersionName: versionStore.find((version) => version.id === versionId)?.versionName ?? heatmap.currentVersionName,
        }
      : heatmap)
    return resolveMock(createHeatmapActionResult('默认版本已更新。', 'heatmap_version'))
  },

  createVersion: (heatmapId: string, version: Omit<HeatmapVersion, 'id' | 'heatmapId' | 'isDefault' | 'archived' | 'createdBy' | 'createdAt'> & { setDefault: boolean }): Promise<HeatmapActionResult> => {
    const createdVersion: HeatmapVersion = {
      id: `hv_created_${Date.now()}`,
      heatmapId,
      versionName: version.versionName,
      versionDesc: version.versionDesc,
      baseUrl: version.baseUrl,
      snapshotUrl: version.snapshotUrl,
      validStartTime: version.validStartTime,
      validEndTime: version.validEndTime,
      isDefault: version.setDefault,
      archived: false,
      createdBy: 'Chaoyang Xu',
      createdAt: '2026-05-21 10:45:00',
    }
    if (version.setDefault) {
      versionStore = versionStore.map((item) => item.heatmapId === heatmapId ? { ...item, isDefault: false } : item)
      heatmapStore = heatmapStore.map((heatmap) => heatmap.id === heatmapId
        ? { ...heatmap, currentVersionId: createdVersion.id, currentVersionName: createdVersion.versionName }
        : heatmap)
    }
    versionStore = [createdVersion, ...versionStore]
    return resolveMock(createHeatmapActionResult('热图版本已创建。', 'heatmap_version'))
  },

  updateVersion: (
    heatmapId: string,
    versionId: string,
    version: Omit<HeatmapVersion, 'id' | 'heatmapId' | 'isDefault' | 'archived' | 'createdBy' | 'createdAt'> & { setDefault: boolean },
  ): Promise<HeatmapActionResult> => {
    if (version.setDefault) {
      versionStore = versionStore.map((item) => item.heatmapId === heatmapId ? { ...item, isDefault: item.id === versionId } : item)
      heatmapStore = heatmapStore.map((heatmap) => heatmap.id === heatmapId
        ? { ...heatmap, currentVersionId: versionId, currentVersionName: version.versionName }
        : heatmap)
    }

    versionStore = versionStore.map((item) => item.id === versionId
      ? {
          ...item,
          versionName: version.versionName,
          versionDesc: version.versionDesc,
          baseUrl: version.baseUrl,
          snapshotUrl: version.snapshotUrl,
          validStartTime: version.validStartTime,
          validEndTime: version.validEndTime,
          isDefault: version.setDefault || item.isDefault,
        }
      : item)

    return resolveMock(createHeatmapActionResult('热图版本已更新。', 'heatmap_version'))
  },

  copyVersion: (heatmapId: string, versionId: string): Promise<HeatmapActionResult> => {
    const source = versionStore.find((version) => version.heatmapId === heatmapId && version.id === versionId)

    if (!source) {
      return resolveMock({
        success: false,
        id: '',
        message: '未找到要复制的版本。',
      })
    }

    versionStore = [
      {
        ...source,
        id: `hv_copy_${Date.now()}`,
        versionName: `${source.versionName} - 副本`,
        isDefault: false,
        archived: false,
        createdBy: 'Chaoyang Xu',
        createdAt: '2026-05-21 11:20:00',
      },
      ...versionStore,
    ]

    return resolveMock(createHeatmapActionResult('热图版本已复制。', 'heatmap_version'))
  },

  archiveVersion: (heatmapId: string, versionId: string): Promise<HeatmapActionResult> => {
    const source = versionStore.find((version) => version.heatmapId === heatmapId && version.id === versionId)

    if (!source || source.isDefault) {
      return resolveMock({
        success: false,
        id: versionId,
        message: '默认版本不可删除，请先设置其他默认版本。',
      })
    }

    versionStore = versionStore.map((version) => version.id === versionId ? { ...version, archived: true } : version)
    return resolveMock(createHeatmapActionResult('热图版本已归档。', 'heatmap_version'))
  },

  getClickedUsers: (_context: { elementKey?: string, pointId?: string, keyword: string, abnormalOnly: boolean }): Promise<HeatmapClickedUser[]> => {
    const keyword = _context.keyword.trim().toLowerCase()
    const filtered = mockClickedUsers.filter((user) => {
      const keywordMatched = !keyword || user.userId.toLowerCase().includes(keyword)
      const abnormalMatched = !_context.abnormalOnly || user.anomalyTypes.length > 0
      return keywordMatched && abnormalMatched
    })
    return resolveMock(filtered.map((user) => ({
      ...user,
      userAttributes: [...user.userAttributes],
      anomalyTypes: [...user.anomalyTypes],
    })))
  },

  saveAnalysis: (payload: HeatmapSaveAnalysisPayload): Promise<HeatmapActionResult> =>
    resolveMock(createSavedHeatmapResult(payload)),

  saveToDashboard: (payload: HeatmapDashboardPayload): Promise<HeatmapActionResult> =>
    resolveMock(createDashboardHeatmapResult(payload)),

  shareHeatmap: (payload: HeatmapSharePayload): Promise<HeatmapActionResult> =>
    resolveMock(createShareHeatmapResult(payload)),

  getElementCatalog: (): Promise<HeatmapElementStat[]> =>
    resolveMock(mockHeatmapElements.map((element) => ({ ...element }))),

  getPointCatalog: (): Promise<HeatmapClickPoint[]> =>
    resolveMock(mockHeatmapPoints.map((point) => ({ ...point }))),
}
