import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  calculateSmoothTraffic,
  calculateTrafficRecommendation,
  canTransitionFeaturePublishStatus,
  canTransitionFeatureStatus,
  canUseAbAction,
  evaluateFeatureDecision,
  getAbPermissionLevel,
  getExperimentActionAvailability,
  validateExperimentParamValue,
  validateMetricFormula,
  validateTrafficRatios,
} from '../src/utils/abTestingRules.ts'
import {
  abAlarmTasks,
  abExperimentVariants,
  abExperiments,
  abFeatureFlags,
  abFeatureVersions,
  abMetricGroups,
  abMetricBindingSnapshots,
  abMetrics,
  abMetricTemplates,
  abMustSeeMetricTrends,
  abOperationLogs,
  abPublishPlans,
  abReceiverGroups,
  abReportOverviews,
  abWhitelistTests,
} from '../src/mock/abTesting.ts'

const abExperimentTypes = [
  'CLIENT_CODE',
  'SERVER_CODE',
  'VISUAL',
  'SPLIT_URL',
  'PUSH',
  'MAB',
  'MVT',
  'PERSONALIZATION_WEB',
  'PERSONALIZATION_CODE',
  'PARENT_CHILD',
  'REVERSE',
  'AD',
]

test('mock data covers every A/B experiment type with variants and reports', () => {
  for (const type of abExperimentTypes) {
    const experiment = abExperiments.find((item) => item.type === type)
    assert.ok(experiment, `missing experiment for ${type}`)
    assert.ok(abExperimentVariants.some((variant) => variant.experimentId === experiment.id), `missing variants for ${type}`)
    const report = abReportOverviews.find((overview) => overview.experimentId === experiment.id)
    assert.ok(report, `missing report for ${type}`)
    assert.equal(report.coreMetricResults.length > 0, true, `missing metric results for ${type}`)
    assert.equal(report.versions.length > 0, true, `missing report versions for ${type}`)
    assert.equal(abMetricBindingSnapshots.some((snapshot) => snapshot.experimentId === experiment.id), true, `missing metric snapshots for ${type}`)
  }
})

test('metric management mock data covers group types and interactions', () => {
  const groupTypes = new Set(abMetricGroups.map((group) => group.type))
  for (const type of ['event', 'retention', 'funnel']) {
    assert.equal(groupTypes.has(type), true, `missing ${type} metric group`)
  }

  for (const group of abMetricGroups) {
    const groupMetrics = group.metricIds
      .map((metricId) => abMetrics.find((metric) => metric.id === metricId))
      .filter(Boolean)
    assert.equal(groupMetrics.length, group.metricIds.length, `metric group ${group.id} references missing metrics`)
    assert.equal(groupMetrics.length > 0, true, `metric group ${group.id} should have metrics`)
    for (const metric of groupMetrics) {
      assert.equal(metric.metricCategory, group.type, `metric ${metric.id} type should match group ${group.id}`)
      assert.equal(metric.metricGroupId, group.id, `metric ${metric.id} should point back to group ${group.id}`)
      assert.equal(metric.status, group.status, `metric ${metric.id} status should match group ${group.id}`)
    }
    if (group.type === 'retention' || group.type === 'funnel') {
      assert.equal(group.metricIds.length, 1, `${group.type} metric group ${group.id} should contain exactly one metric`)
    }
  }

  assert.equal(abMetricGroups.some((group) => group.status === 'active'), true)
  assert.equal(abMetricGroups.some((group) => group.status === 'offline'), true)
  assert.equal(abMetricGroups.some((group) => group.permissionType === 'public'), true)
  assert.equal(abMetricGroups.some((group) => group.permissionType === 'private'), true)
  assert.equal(abMetricTemplates.some((template) => template.templateType === 'common'), true)
  assert.equal(abMetricTemplates.some((template) => template.templateType === 'personal'), true)
  assert.equal(abAlarmTasks.some((task) => task.alarmType === 'dashboard'), true)
  assert.equal(abAlarmTasks.some((task) => task.alarmType === 'experiment'), true)
  assert.equal(abAlarmTasks.some((task) => task.enabled), true)
  assert.equal(abAlarmTasks.some((task) => !task.enabled), true)
  assert.equal(abReceiverGroups.length >= 3, true)

  const eventDefinitions = abMetrics
    .filter((metric) => metric.metricCategory === 'event')
    .map((metric) => metric.definition)
    .filter((definition) => 'events' in definition)
  assert.equal(abMetrics.some((metric) => metric.metricCategory === 'event' && metric.metricKind === 'composite'), true)
  assert.equal(
    eventDefinitions.some((definition) => definition.events.some((event) => event.propertyId && ['sum/au', 'sum/uv', 'sum/pv', 'sum', 'count_distinct'].includes(event.operator))),
    true,
  )
  assert.equal(eventDefinitions.some((definition) => definition.events.some((event) => event.aggregationFilter?.enabled)), true)
  assert.equal(eventDefinitions.some((definition) => definition.flexibleProperties.length > 0), true)

  const mustSeeMetricIds = abMetrics.filter((metric) => metric.isMustSee).map((metric) => metric.id)
  assert.equal(mustSeeMetricIds.length >= 4, true)
  for (const metricId of mustSeeMetricIds) {
    assert.equal(abMustSeeMetricTrends.some((trend) => trend.metricId === metricId), true, `missing must-see trend for ${metricId}`)
  }
})

test('feature mock data covers statuses, version types, publish plans, whitelists, and logs', () => {
  const featureIds = new Set(abFeatureFlags.map((feature) => feature.featureId))
  const versionFeatureIds = new Set(abFeatureVersions.map((version) => version.featureId))
  assert.equal(abFeatureFlags.length >= 18, true, 'feature table should have enough rows for paging and filtering')
  assert.equal(abFeatureFlags.filter((feature) => feature.appId === 'app_news').length >= 14, true, 'app_news should have rich feature rows')
  assert.equal(new Set(abFeatureFlags.map((feature) => feature.appId)).size >= 3, true, 'feature data should cover multiple apps')
  for (const feature of abFeatureFlags) {
    assert.equal(versionFeatureIds.has(feature.featureId), true, `missing versions for ${feature.featureId}`)
    if (feature.currentVersionId) {
      assert.equal(abFeatureVersions.some((version) => version.versionId === feature.currentVersionId), true, `missing current version for ${feature.featureId}`)
    }
  }
  for (const version of abFeatureVersions) {
    assert.equal(featureIds.has(version.featureId), true, `version ${version.versionId} should point to an existing feature`)
    assert.equal(version.variants.length > 0, true, `version ${version.versionId} should have variants`)
    assert.ok(version.defaultRule, `version ${version.versionId} should have default rule`)
  }

  for (const terminalType of ['client', 'server']) {
    assert.equal(abFeatureFlags.some((feature) => feature.terminalType === terminalType), true, `missing ${terminalType} feature`)
  }
  for (const featureType of ['public', 'private']) {
    assert.equal(abFeatureFlags.some((feature) => feature.featureType === featureType), true, `missing ${featureType} feature`)
  }
  for (const status of ['enabled', 'disabled']) {
    assert.equal(abFeatureFlags.some((feature) => feature.status === status), true, `missing ${status} feature`)
  }
  for (const publishStatus of ['unpublished', 'pending_publish', 'gray', 'publish_confirm', 'full', 'rolled_back', 'disabled', 'canceled']) {
    assert.equal(abFeatureFlags.some((feature) => feature.publishStatus === publishStatus), true, `missing ${publishStatus} feature`)
  }
  for (const variantType of ['boolean', 'string', 'number', 'json']) {
    assert.equal(abFeatureVersions.some((version) => version.variantType === variantType), true, `missing ${variantType} feature version`)
  }
  for (const versionStatus of ['unpublished', 'pending_publish', 'gray', 'publish_confirm', 'full', 'rolled_back', 'disabled', 'canceled']) {
    assert.equal(abFeatureVersions.some((version) => version.versionStatus === versionStatus), true, `missing ${versionStatus} feature version`)
  }
  assert.equal(abFeatureVersions.some((version) => version.audienceRules.some((rule) => rule.deliveryType === 'multi_variant')), true)
  assert.equal(abFeatureVersions.some((version) => version.audienceRules.some((rule) => rule.deliveryType === 'no_value')), true)

  for (const planStatus of ['pending', 'running', 'completed', 'canceled', 'rolled_back', 'failed']) {
    assert.equal(abPublishPlans.some((plan) => plan.status === planStatus), true, `missing ${planStatus} publish plan`)
  }
  for (const whitelistStatus of ['active', 'expired', 'terminated']) {
    assert.equal(abWhitelistTests.some((item) => item.status === whitelistStatus), true, `missing ${whitelistStatus} whitelist`)
  }
  assert.equal(abWhitelistTests.some((item) => item.versionMode === 'custom' && item.customVariants?.length), true)
  for (const action of ['create_feature', 'publish_feature', 'cancel_feature_publish', 'rollback_feature', 'feature_disable', 'schedule_feature_publish_failed']) {
    assert.equal(abOperationLogs.some((log) => log.action === action), true, `missing ${action} operation log`)
  }
})

test('guards experiment state transitions and uniform diversion start gate', () => {
  assert.equal(getExperimentActionAvailability('DRAFT', 'submit_debug').nextStatus, 'DEBUGGING')
  assert.equal(getExperimentActionAvailability('RUNNING', 'pause').nextStatus, 'PAUSED')
  assert.equal(getExperimentActionAvailability('ARCHIVED', 'start').available, false)
  assert.equal(
    getExperimentActionAvailability('DEBUGGING', 'start', {
      hasPermission: true,
      uniformDiversionReady: false,
    }).reason,
    '增强分流均匀性尚未调平成功',
  )
})

test('validates experiment params, metric formulas, and traffic ratios', () => {
  assert.equal(validateExperimentParamValue('NUMBER', 10).valid, true)
  assert.equal(validateExperimentParamValue('BOOLEAN', 'true').valid, false)
  assert.equal(validateExperimentParamValue('JSON', '{"enabled":true}').valid, true)
  assert.equal(validateExperimentParamValue('JSON', '[1,2]').message, 'Json 参数顶层必须是对象')

  assert.equal(validateMetricFormula('(A-B)/A', ['A', 'B']).valid, true)
  assert.match(validateMetricFormula('A/C', ['A', 'B']).message ?? '', /未定义事件编号/)
  assert.match(validateMetricFormula('((A+B))', ['A', 'B']).message ?? '', /一层括号/)

  assert.equal(validateTrafficRatios([50, 50]).valid, true)
  assert.equal(validateTrafficRatios([30, 30]).message, '流量比例合计必须等于 100%')
})

test('calculates smooth traffic and traffic calculator recommendations', () => {
  const currentTraffic = calculateSmoothTraffic(
    {
      startTrafficRatio: 20,
      targetTrafficRatio: 50,
      durationMinutes: 30,
      startedAt: '2026-05-28T10:00:00.000Z',
    },
    new Date('2026-05-28T10:15:00.000Z'),
  )
  assert.equal(currentTraffic, 35)

  const result = calculateTrafficRecommendation({
    estimatedTotalUsers: 100000,
    versionCount: 2,
    mdeValue: 0.05,
    metricVariance: 0.1056,
    trafficFilterRatio: 1,
  })
  assert.equal(result.sampleSizePerGroup > 0, true)
  assert.equal(result.recommendedTotalSampleSize, result.sampleSizePerGroup * 2)
})

test('audits permission levels and action requirements', () => {
  const context = {
    userId: 'user_growth_lin',
    roles: ['EXPERIMENT_OWNER'],
    permissions: { export_report: true },
  }
  const ownerLevel = getAbPermissionLevel(context, {
    ownerId: 'user_growth_lin',
    collaboratorIds: [],
    visibility: 'PRIVATE',
  })
  const publicLevel = getAbPermissionLevel(context, {
    ownerId: 'other_user',
    collaboratorIds: [],
    visibility: 'PUBLIC',
  })
  assert.equal(ownerLevel, 'admin')
  assert.equal(publicLevel, 'view')
  assert.equal(canUseAbAction(context, 'start', ownerLevel).allowed, true)
  assert.equal(canUseAbAction(context, 'publish_feature', publicLevel).allowed, false)
  assert.equal(canUseAbAction(context, 'export_report', publicLevel).allowed, true)
})

test('guards feature and publish state transitions', () => {
  assert.equal(canTransitionFeatureStatus('enabled', 'disabled'), true)
  assert.equal(canTransitionFeatureStatus('disabled', 'enabled'), true)
  assert.equal(canTransitionFeatureStatus('disabled', 'deleted'), true)
  assert.equal(canTransitionFeatureStatus('enabled', 'deleted'), false)
  assert.equal(canTransitionFeatureStatus('deleted', 'enabled'), false)

  assert.equal(canTransitionFeaturePublishStatus('unpublished', 'pending_publish'), true)
  assert.equal(canTransitionFeaturePublishStatus('unpublished', 'gray'), true)
  assert.equal(canTransitionFeaturePublishStatus('unpublished', 'full'), true)
  assert.equal(canTransitionFeaturePublishStatus('pending_publish', 'gray'), true)
  assert.equal(canTransitionFeaturePublishStatus('pending_publish', 'canceled'), true)
  assert.equal(canTransitionFeaturePublishStatus('gray', 'full'), true)
  assert.equal(canTransitionFeaturePublishStatus('gray', 'rolled_back'), true)
  assert.equal(canTransitionFeaturePublishStatus('publish_confirm', 'gray'), true)
  assert.equal(canTransitionFeaturePublishStatus('publish_confirm', 'rolled_back'), true)
  assert.equal(canTransitionFeaturePublishStatus('full', 'rolled_back'), true)
  assert.equal(canTransitionFeaturePublishStatus('rolled_back', 'disabled'), true)
  assert.equal(canTransitionFeaturePublishStatus('full', 'gray'), false)
  assert.equal(canTransitionFeaturePublishStatus('disabled', 'full'), false)
})

test('evaluates feature decisions with whitelist, experiment, disabled and rule precedence', () => {
  const feature = {
    featureId: 'feat_login',
    appId: 'app_news',
    key: 'app_login_type',
    name: '登录方式',
    description: '',
    terminalType: 'client',
    featureType: 'public',
    status: 'enabled',
    publishStatus: 'full',
    currentVersionId: 'ver_1',
    owners: ['u1'],
    tags: [],
    relatedExperimentIds: [],
    createdBy: 'u1',
    createdAt: '2026-05-28T10:00:00Z',
    updatedAt: '2026-05-28T10:00:00Z',
  }
  const version = {
    versionId: 'ver_1',
    featureId: 'feat_login',
    versionNo: 'V1',
    versionStatus: 'full',
    variantType: 'string',
    variants: [
      { variantId: 'wechat', name: '微信登录', value: 'wechat', description: '' },
      { variantId: 'qq', name: 'QQ 登录', value: 'qq', description: '' },
    ],
    audienceRules: [
      {
        ruleId: 'rule_android',
        name: 'Android 用户',
        order: 1,
        conditions: [{ fieldSource: 'device_property', fieldName: 'os', operator: 'eq', value: 'Android' }],
        deliveryType: 'single_variant',
        variantId: 'qq',
      },
    ],
    defaultRule: {
      ruleId: 'else',
      name: '默认',
      order: 999,
      conditions: [],
      deliveryType: 'single_variant',
      variantId: 'wechat',
    },
    publishTraffic: 100,
    createdBy: 'u1',
    createdAt: '2026-05-28T10:00:00Z',
  }

  assert.equal(
    evaluateFeatureDecision({ feature, version, userId: 'user_1', context: { os: 'Android' }, localDefault: 'local' }).value,
    'qq',
  )
  assert.equal(
    evaluateFeatureDecision({ feature, version, userId: 'user_1', context: { os: 'iOS' }, localDefault: 'local' }).value,
    'wechat',
  )
  assert.equal(
    evaluateFeatureDecision({ feature: { ...feature, status: 'disabled' }, version, userId: 'user_1', context: {}, localDefault: 'local' }).decisionReason,
    'feature_disabled',
  )
  assert.equal(
    evaluateFeatureDecision({ feature, version, userId: 'user_1', context: {}, inWhitelist: true, localDefault: 'local' }).decisionSource,
    'whitelist',
  )
  assert.equal(
    evaluateFeatureDecision({ feature, version, userId: 'user_1', context: {}, inWhitelist: true, inExperiment: true, localDefault: 'local' }).decisionSource,
    'whitelist',
  )
  assert.equal(
    evaluateFeatureDecision({ feature, version, userId: 'user_1', context: {}, inExperiment: true, localDefault: 'local' }).decisionSource,
    'experiment',
  )
  assert.equal(
    evaluateFeatureDecision({
      feature,
      version: { ...version, publishTraffic: 0 },
      userId: 'user_1',
      context: { os: 'Android' },
      localDefault: 'local',
    }).decisionReason,
    'traffic_not_hit',
  )
  assert.equal(
    evaluateFeatureDecision({
      feature,
      version: {
        ...version,
        audienceRules: [
          {
            ruleId: 'rule_custom',
            name: '自定义变量',
            order: 1,
            conditions: [{ fieldSource: 'custom_variable', fieldName: 'scene', operator: 'neq', value: 'blocked' }],
            deliveryType: 'single_variant',
            variantId: 'qq',
          },
        ],
      },
      userId: 'user_1',
      context: {},
      localDefault: 'local',
    }).value,
    'wechat',
  )
  assert.equal(
    evaluateFeatureDecision({
      feature,
      version: {
        ...version,
        audienceRules: [
          {
            ruleId: 'rule_first',
            name: '第一条命中规则',
            order: 1,
            conditions: [{ fieldSource: 'device_property', fieldName: 'os', operator: 'eq', value: 'Android' }],
            deliveryType: 'single_variant',
            variantId: 'qq',
          },
          {
            ruleId: 'rule_second',
            name: '第二条也命中但不应继续判断',
            order: 2,
            conditions: [{ fieldSource: 'device_property', fieldName: 'os', operator: 'eq', value: 'Android' }],
            deliveryType: 'single_variant',
            variantId: 'wechat',
          },
        ],
      },
      userId: 'user_1',
      context: { os: 'Android' },
      localDefault: 'local',
    }).ruleId,
    'rule_first',
  )
})
