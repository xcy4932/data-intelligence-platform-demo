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
