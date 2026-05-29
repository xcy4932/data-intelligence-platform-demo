# A/B Testing API Contract

This document keeps the frontend mock service and the production backend aligned for the A/B testing PRD set. The current frontend implementation uses `src/services/abTestingService.ts`; production services should preserve the same request and response shapes defined in `src/types/abTesting.ts`.

## Contract Rules

- Every experiment, metric group, metric, Feature version, report, and async task must keep immutable snapshots for historical bindings.
- State transitions must use `getExperimentActionAvailability` semantics from `src/utils/abTestingRules.ts`.
- Mutating endpoints must write `OperationLog` records with `before`, `after`, operator, object type, and created time.
- Long-running actions must return a task id, status, progress, failure reason, cancel support, and retry support.
- Frontend mock data and production API must use identical enum values.

## Experiment Domain

| Capability | Method | Path | Request | Response |
| --- | --- | --- | --- | --- |
| Workspace summary | GET | `/api/abtest/workspace/summary` | app/user context | experiment counts, Feature counts, metric counts, PRD coverage |
| Experiment list | GET | `/api/abtest/experiments` | keyword, status, type, owner, appId | `Experiment[]` |
| Experiment detail | GET | `/api/abtest/experiments/{experimentId}` | path id | `Experiment` |
| Planning bundle | GET | `/api/abtest/experiments/{experimentId}/planning-bundle` | path id | experiment, variants, params, diversion, traffic, uniform, smooth task |
| Validate draft | POST | `/api/abtest/experiments/validate` | partial `Experiment`, variants, params, traffic config | pass flag and check items |
| Submit to debug | POST | `/api/abtest/experiments/submit-debug` | `ExperimentDraft` | created `Experiment`, validation result, message |
| Transition status | POST | `/api/abtest/experiments/{experimentId}/status-transition` | action, reason, expected status | updated `Experiment`, message |
| Safe edit running experiment | POST | `/api/abtest/experiments/{experimentId}/safe-edit` | editable fields, expected status, reason | updated `Experiment`, message |
| Scale experiment traffic | POST | `/api/abtest/experiments/{experimentId}/traffic-scale` | target ratio, ramp duration, expected status, reason | updated traffic config, async task, message |
| Close experiment variant | POST | `/api/abtest/experiments/{experimentId}/variants/{variantId}/close` | expected status, reason | updated variant, updated experiment, message |
| Traffic calculator | POST | `/api/abtest/traffic/calculator` | estimated users, versions, MDE, variance, filter ratio | sample size, traffic ratio, suggestions |
| Traffic layers | GET | `/api/abtest/traffic/layers` | appId, terminal type | `TrafficLayer[]` |
| Mutex domains | GET | `/api/abtest/traffic/mutex-domain-groups` | appId, terminal type | `MutexDomainGroup[]` |
| Operation logs | GET | `/api/abtest/operation-logs` | objectId, objectType, time range | `OperationLog[]` |

## Metric Domain

| Capability | Method | Path | Request | Response |
| --- | --- | --- | --- | --- |
| Metric groups | GET | `/api/apps/{appId}/metric-groups` | type, status, owner | `MetricGroup[]` |
| Metrics | GET | `/api/apps/{appId}/metrics` | groupId, category, keyword | `Metric[]` |
| Metric templates | GET | `/api/apps/{appId}/metric-templates` | scope, owner | `MetricTemplate[]` |
| Alarm tasks | GET | `/api/apps/{appId}/metric-alarm-tasks` | enabled, scene | `AlarmTask[]` |
| Receiver groups | GET | `/api/apps/{appId}/metric-receiver-groups` | keyword | `ReceiverGroup[]` |
| Must-see trends | GET | `/api/apps/{appId}/metric-must-see-trends` | metric ids, date range | `MustSeeMetricTrend[]` |

## Report Domain

| Capability | Method | Path | Request | Response |
| --- | --- | --- | --- | --- |
| Report overview | GET | `/api/abtest/reports/{experimentId}/overview` | experiment id | `ExperimentReportOverview` |
| Metric statistics | POST | `/api/abtest/reports/{experimentId}/metrics` | `ReportFilter` | metric results, trend points, filter templates |
| Funnel report | GET | `/api/abtest/reports/funnels/{metricId}` | experiment id, versions | `FunnelReport` |
| Cohort report | GET | `/api/abtest/reports/cohorts/{metricId}` | experiment id, date range | `CohortReport` |
| Heatmap report | GET | `/api/abtest/reports/{experimentId}/heatmap` | page url, version ids | `HeatmapReport` |
| MAB report | GET | `/api/abtest/reports/{experimentId}/mab` | experiment id | `MabReport` |
| Report export tasks | GET | `/api/abtest/reports/{experimentId}/export-tasks` | experiment id, status | `ReportExportTask[]` |
| Create report export | POST | `/api/abtest/reports/{experimentId}/export-tasks` | format, scope, filters, async options | `ReportExportTask`, message |
| Cancel report export | POST | `/api/abtest/report-export-tasks/{taskId}/cancel` | task id, reason | updated `ReportExportTask`, operation log |
| Retry report export | POST | `/api/abtest/report-export-tasks/{taskId}/retry` | task id | queued `ReportExportTask`, operation log |
| Sensitive insight tasks | GET | `/api/abtest/insight-tasks` | experimentId, status | `SensitiveInsightTask[]` |

## Production Governance

| Capability | Method | Path | Request | Response |
| --- | --- | --- | --- | --- |
| Permission audit | GET | `/api/abtest/governance/permission-audits` | user, object ids, actions | `PermissionAuditItem[]` |
| Performance budgets | GET | `/api/abtest/governance/performance-budgets` | appId, module | `PerformanceBudgetItem[]` |
| E2E acceptance matrix | GET | `/api/abtest/governance/e2e-acceptance` | PRD/version | `E2EAcceptanceCase[]` |
| Error recovery | POST | `/api/abtest/governance/recover` | failed task ids, refresh scope | recovery result, refreshed task states |

## Feature Flag Domain

| Capability | Method | Path | Request | Response |
| --- | --- | --- | --- | --- |
| Feature list | GET | `/api/feature-flags` | appId, status, publish status | `FeatureFlag[]` |
| Create Feature | POST | `/api/feature-flags` | `FeatureFlagDraft` | `FeatureFlag`, initial `FeatureVersion`, message |
| Feature versions | GET | `/api/feature-flags/{featureId}/versions` | feature id | `FeatureVersion[]` |
| Create Feature version | POST | `/api/feature-flags/{featureId}/versions` | `FeatureVersionDraft` | `FeatureVersion`, message |
| Publish Feature version | POST | `/api/feature-flags/{featureId}/versions/{versionId}/publish` | `FeaturePublishRequest` | updated `FeatureFlag`, updated `FeatureVersion`, `PublishPlan` |
| Rollback Feature | POST | `/api/feature-flags/{featureId}/rollback` | target version id, reason | updated `FeatureFlag`, target `FeatureVersion` |
| Feature lifecycle | POST | `/api/feature-flags/{featureId}/lifecycle` | enable, disable, or delete | updated `FeatureFlag`, operation log |
| Publish plans | GET | `/api/feature-flags/publish-plans` | featureId, status | `PublishPlan[]` |
| Whitelist tests | GET | `/api/feature-flags/whitelist-tests` | featureId, status | `WhitelistTest[]` |
| Create whitelist test | POST | `/api/feature-flags/{featureId}/whitelist-tests` | `WhitelistTestDraft` | `WhitelistTest`, message |
| Solidify experiment | POST | `/api/feature-flags/solidify-from-experiment` | experiment id, winner variant, Feature key, rollout traffic | `FeatureFlag`, `FeatureVersion`, message |
| Runtime decision | POST | `/api/feature-flags/runtime/decision` | featureId/key, userId, context, defaults | `FeatureDecisionResult` |

## Frontend Mapping

- Domain types: `src/types/abTesting.ts`
- Mock data: `src/mock/abTesting.ts`
- API path constants and mock service: `src/services/abTestingService.ts`
- State, draft restore, selection persistence, async polling: `src/stores/abTesting.ts`
- Workbench UI: `src/views/ab-testing/AbTestingWorkbenchView.vue`
- Rules and tests: `src/utils/abTestingRules.ts`, `tests/ab-testing-rules.test.mjs`
