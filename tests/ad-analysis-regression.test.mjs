import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildAdDownloadFileName, createXlsxBytes } from '../src/services/adAnalysisDownload.ts'
import {
  getAdQueryFailure,
  getAdReportGateFailure,
  validateAdMetricFormula,
  validateMediaEventChain,
  validateTemplateMetricFormulas,
} from '../src/services/adAnalysisRules.ts'

const baseContext = {
  projectId: 'project_demo_auto',
  userId: 'u_xcy',
  userName: 'Chaoyang Xu',
  currentVersion: '1.25',
  isNewUser: false,
  modulePurchased: true,
  moduleDeployed: true,
  dataFusionReady: true,
  idMappingReady: true,
  monitoringDataReady: true,
  dataSourceAvailable: true,
  vecdpPurchased: true,
  iadPurchased: true,
  monitoringLinkSource: 'iad',
  permissions: {
    viewAnalysis: true,
    manageReport: true,
    manageTemplate: true,
    viewAdReport: true,
    downloadData: true,
    createSegment: true,
  },
  dataPermission: {
    channelIds: ['toutiao'],
    advertiserIds: ['adv_ev_a'],
    adGroupIds: ['grp_launch'],
    adPlanIds: ['plan_city'],
    adCreativeIds: ['crt_video_a'],
    reportIds: ['rpt_effect_growth'],
    subjectTypes: ['user'],
    tagIds: [],
    behaviorIds: ['click', 'phone', 'buycar'],
    segmentIds: [],
  },
}

const template = {
  id: 'tpl',
  name: '模板',
  subjectType: 'user',
  description: '',
  status: 'enabled',
  creatorId: 'u_xcy',
  creatorName: 'Chaoyang Xu',
  createdAt: '2026-05-28 10:00:00',
  updatedAt: '2026-05-28 10:00:00',
  behaviorEventConfig: [
    { id: 'evt-click', templateId: 'tpl', adBehavior: 'click', eventName: 'click', displayName: '点击', orderIndex: 1 },
    { id: 'evt-phone', templateId: 'tpl', adBehavior: 'lead', eventName: 'phone', displayName: '留资', orderIndex: 2 },
    { id: 'evt-buy', templateId: 'tpl', adBehavior: 'deal', eventName: 'buycar', displayName: '成交', orderIndex: 3 },
  ],
  metricConfig: [
    {
      id: 'metric-good',
      templateId: 'tpl',
      name: '有效指标',
      description: '',
      metricType: 'single',
      formula: 'A / B',
      conditions: [
        { variable: 'A', source: 'behavior', statistic: 'users', filters: [] },
        { variable: 'B', source: 'behavior', statistic: 'users', filters: [] },
      ],
      displayFormat: 'decimal',
      creatorId: 'u_xcy',
      creatorName: 'Chaoyang Xu',
      creatorType: 'user',
      isRemovable: true,
    },
  ],
}

test('validates metric formulas used by templates and queries', () => {
  assert.equal(validateAdMetricFormula('A / B + 10', ['A', 'B']).valid, true)
  assert.equal(validateAdMetricFormula('A / C', ['A', 'B']).valid, false)
  assert.equal(validateAdMetricFormula('A / 0', ['A']).message, '除法分母不能为固定 0。')

  const invalidTemplate = {
    ...template,
    metricConfig: [{ ...template.metricConfig[0], name: '坏公式', formula: 'A / C' }],
  }
  const failure = validateTemplateMetricFormulas(invalidTemplate, ['metric-good'])
  assert.equal(failure?.reason, 'metric_formula_error')
  assert.match(failure?.message ?? '', /坏公式/)
})

test('classifies permission, data source, ingestion, and ad report purchase failures', () => {
  assert.equal(getAdQueryFailure({ ...baseContext, permissions: { ...baseContext.permissions, viewAnalysis: false } })?.reason, 'permission_denied')
  assert.equal(getAdQueryFailure({ ...baseContext, dataSourceAvailable: false })?.reason, 'data_source_unavailable')
  assert.equal(getAdQueryFailure({ ...baseContext, dataFusionReady: false })?.reason, 'data_ingestion_incomplete')
  assert.equal(getAdReportGateFailure({ ...baseContext, vecdpPurchased: false })?.reason, 'ad_report_not_purchased')
  assert.equal(getAdReportGateFailure({ ...baseContext, iadPurchased: false })?.reason, 'ad_report_not_purchased')
})

test('detects missing downstream media path events before querying', () => {
  assert.equal(validateMediaEventChain(template, ['click', 'phone', 'buycar']), null)
  const failure = validateMediaEventChain(template, ['click', 'test_drive', 'buycar'])
  assert.equal(failure?.reason, 'post_event_missing')
  assert.match(failure?.message ?? '', /test_drive/)
})

test('download task mock produces xlsx-compatible zip bytes instead of html xls', () => {
  const bytes = createXlsxBytes([{ 媒体渠道: '巨量引擎', 点击数: 123 }])
  assert.equal(bytes[0], 0x50)
  assert.equal(bytes[1], 0x4b)
  assert.equal(buildAdDownloadFileName('广告效果明细', '2026-05-28T20:30:00'), '广告效果明细_20260528_203000.xlsx')
})
