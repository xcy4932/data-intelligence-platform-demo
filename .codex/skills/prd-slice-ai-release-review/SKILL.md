---
name: prd-slice-ai-release-review
description: Use this skill during AI second-pass review of an implemented PRD slice. It determines whether the slice can be released automatically after Human Review Required, using strict Blocking / Should Fix / Suggestion criteria.
---

# PRD Slice AI Release Review Skill

## Purpose

This skill defines when an implemented PRD slice can be automatically released by AI second-pass review.

The goal is to avoid both unsafe release and endless perfectionism.

## Review Principle

Classify every issue as one of:

- Blocking
- Should Fix
- Suggestion

Only Blocking issues prevent release.

A slice can be released only when:

- Blocking issues count is 0
- required checks pass
- slice boundary is respected
- implementation documents are consistent
- acceptance criteria are satisfied

## Required Inputs

Always inspect:

- AGENTS.md
- docs/implementation/MASTER_PRD_QUEUE.md
- docs/implementation/CURRENT_TASK.md
- current PRD IMPLEMENTATION_MAP.md
- current PRD CURRENT_SLICE.md
- current PRD PROGRESS.md
- current PRD ACCEPTANCE_CHECKLIST.md
- current PRD SLICE_SELF_REVIEW.md
- git diff --name-only
- git diff
- commands and results recorded in SLICE_SELF_REVIEW.md
- files changed in the current slice

## Release Decision

Return:

AI_REVIEW_CAN_RELEASE: Yes

only when all of the following are true:

1. Slice boundary is respected.
2. No future slice was implemented early.
3. No unrelated files were modified.
4. All required acceptance criteria are Passed or Not Applicable.
5. There are no fake buttons, TODO-only behavior, or unreachable UI.
6. Type-check passed.
7. Build passed.
8. Any lint/test failure is unrelated and clearly documented.
9. Permission behavior is correct for the slice.
10. Required UI states are implemented for the slice.
11. Required refresh behavior is implemented for the slice.
12. Required audit behavior is implemented for the slice.
13. Data contracts are not broken.
14. Implementation docs are consistent.
15. Blocking issues count is 0.

Return:

AI_REVIEW_CAN_RELEASE: No

if any Blocking issue exists.

## Blocking Issues

The following are Blocking:

### 1. Slice Boundary Blocking

- Implemented next slice early.
- Implemented unrelated PRD/module.
- Changed unrelated files.
- Added broad architecture changes not required by the slice.
- Expanded scope beyond current slice in a way that affects future slices.

### 2. Acceptance Blocking

- Any current-slice acceptance item is Failed.
- Any current-slice acceptance item is Partial without a clear reason.
- Required PRD behavior is missing.
- Main user flow cannot be completed.

### 3. Fake UI Blocking

- Visible button has no real action.
- Menu item leads to placeholder behavior when PRD expects function.
- Table action exists but does nothing.
- Modal/drawer opens but cannot complete intended flow.
- TODO-only implementation is user-visible.
- UI appears functional but is not wired.

### 4. State Handling Blocking

- Required loading state missing.
- Required error state missing.
- Required empty or filtered-empty state missing for list/table pages.
- Required 403/no-permission state missing.
- Required disabled action reason missing for visible disabled controls.
- Submit state does not prevent duplicate submission.
- Failure feedback missing for write operations.
- Retry missing for load failure where required.

### 5. Permission Blocking

- User can access data or actions outside their permission.
- Route/menu/action visibility is inconsistent.
- No-permission users see business data.
- Organization-scoped users see data outside scope.
- License-disabled scenarios show License-only actions.
- Third-party-source-disabled scenarios show invalid actions where PRD requires empty state.

### 6. Data Consistency Blocking

- Write operation does not refresh required list/detail/statistics/logs.
- Cross-page refresh topic is missing for affected data.
- Audit log refresh is missing when audit log is required.
- List and detail can become stale after the implemented action.
- Mock/service data relation is broken.

### 7. Audit Blocking

- PRD-required write action does not record audit log.
- Audit log fields are incomplete for implemented write action.
- Failure audit is required but missing.
- Audit log target type/id/name is wrong.

### 8. Service / Type / Mock Blocking

- Type-check fails due to current slice.
- Build fails due to current slice.
- Service return type mismatches ServiceResult contract.
- Mock IDs reference missing objects.
- Service exposes mutable shared references when clone protection is expected.
- Error codes are untyped or meaningless.
- Permission/business validation order is changed incorrectly.

### 9. Destructive / Batch / Import / Export Blocking

- Destructive action lacks confirmation.
- Delete/release operation lacks impact or blocking validation.
- Batch operation does not show partial success/failure.
- Import allows invalid rows to submit.
- Export ignores current filters when PRD requires filtered export.
- Export limit handling is missing when required.

### 10. Document Consistency Blocking

- CURRENT_TASK.md and CURRENT_SLICE.md disagree.
- IMPLEMENTATION_MAP.md current slice status is wrong.
- PROGRESS.md current slice status is wrong.
- ACCEPTANCE_CHECKLIST.md is not updated for completed slice.
- MASTER_PRD_QUEUE.md current slice/status is stale.
- SLICE_SELF_REVIEW.md final status conflicts with implementation docs.

## Should Fix Issues

Should Fix issues do not block release if the slice is otherwise correct.

Examples:

- Layout spacing can be improved but page is usable.
- Naming can be clearer but not misleading.
- Minor duplication exists but does not create immediate inconsistency.
- Tooltip copy can be improved.
- Component can be extracted later.
- Table column order can be improved but required fields exist.
- Some optional responsive improvements are missing.

If safe and within current slice, fix Should Fix issues before release.
If fixing them would expand scope, record them only.

## Suggestions

Suggestions must not block release.

Examples:

- Future refactor.
- Future visual polish.
- Optional animation.
- Optional extra mock scenarios.
- Optional performance optimization not needed for current scale.
- Future abstraction.

## Required Review Output

At the end of AI second-pass review, output exactly:

AI_REVIEW_FINAL_STATUS: Passed | Needs Fix | Blocked
AI_REVIEW_RISK_LEVEL: Low | Medium | High
AI_REVIEW_CAN_RELEASE: Yes | No
AI_REVIEW_BLOCKING_COUNT: <number>
AI_REVIEW_SHOULD_FIX_COUNT: <number>
AI_REVIEW_SUGGESTION_COUNT: <number>
AI_REVIEW_CURRENT_PRD: <current PRD>
AI_REVIEW_CURRENT_SLICE: <slice id and name>
AI_REVIEW_BLOCKING_ISSUES:
- <issue or None>
AI_REVIEW_SHOULD_FIX_ISSUES:
- <issue or None>
AI_REVIEW_SUGGESTIONS:
- <suggestion or None>
AI_REVIEW_REVIEWED_FILES:
- <file 1>
AI_REVIEW_SUMMARY:
- <short summary>

## Final Rule

Set AI_REVIEW_CAN_RELEASE to Yes only if:

- AI_REVIEW_FINAL_STATUS is Passed
- AI_REVIEW_BLOCKING_COUNT is 0
- no required check failed because of this slice
- implementation documents are consistent
- current slice acceptance is satisfied

Never set AI_REVIEW_CAN_RELEASE to Yes just because the implementation is "mostly correct".
