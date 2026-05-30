---
name: prd-slice-ai-release-review
description: Use this skill during AI second-pass review of an implemented PRD slice. It determines whether the slice can be released automatically after Human Review Required, using Blocking / Auto-fixable Blocking / Non-auto-fixable Blocking / Should Fix / Suggestion criteria.
---

# PRD Slice AI Release Review Skill

## Purpose

This skill defines when an implemented PRD slice can be automatically released by AI second-pass review.

The goal is to avoid both unsafe release and endless perfectionism.

## Review Principle

Classify every issue as one of:

- Auto-fixable Blocking
- Non-auto-fixable Blocking
- Should Fix
- Suggestion

Only Blocking issues prevent release.

A slice can be released only when:

- Auto-fixable Blocking count is 0
- Non-auto-fixable Blocking count is 0
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

## Auto-fixable Blocking

These block release, but automation may attempt repair if they are clearly inside the current slice:

- Missing current-slice acceptance behavior.
- Missing required loading/empty/error/403/disabled/success/failure state.
- Button/action wiring is incomplete inside current slice.
- Form validation required by current slice is missing.
- Failure feedback required by current slice is missing.
- Submit loading / duplicate submit prevention is missing.
- Refresh topic is missing for current-slice write operation.
- Audit log emit is missing for current-slice write operation.
- Type-check/build error caused by current-slice code.
- Targeted lint error caused by current-slice code.
- Implementation documents are inconsistent but can be safely synchronized.
- Allowed Files section is missing or incomplete for expected current-slice files.

## Non-auto-fixable Blocking

These block release and must stop automation:

- Slice boundary is wrong or too large.
- PRD requirement is ambiguous and requires product judgment.
- Fix requires re-slicing.
- Fix requires broad architecture change.
- Fix requires implementing a future slice.
- Fix requires modifying unrelated PRD/module.
- Codex already implemented future slice early.
- Codex changed unrelated files.
- Fix requires large refactor outside current slice.
- Security or permission model is unclear.
- Data ownership or scope filtering is unclear.
- Current PRD docs conflict and cannot be resolved mechanically.

## Should Fix

Should Fix issues do not block release if no Blocking issues remain.

Examples:

- Layout spacing can be improved but page is usable.
- Naming can be clearer but not misleading.
- Minor duplication exists but does not create immediate inconsistency.
- Tooltip copy can be improved.
- Component can be extracted later.
- Table column order can be improved but required fields exist.

## Suggestions

Suggestions must not block release.

Examples:

- Future refactor.
- Future visual polish.
- Optional animation.
- Optional extra mock scenarios.
- Optional performance optimization not needed for current scale.
- Future abstraction.

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
15. Auto-fixable Blocking count is 0.
16. Non-auto-fixable Blocking count is 0.

Return:

AI_REVIEW_CAN_RELEASE: No

if any Blocking issue exists.

## Required Review Output

At the end of AI second-pass review, output exactly:

AI_REVIEW_FINAL_STATUS: Passed | Needs Fix | Blocked
AI_REVIEW_RISK_LEVEL: Low | Medium | High
AI_REVIEW_CAN_RELEASE: Yes | No
AI_REVIEW_BLOCKING_COUNT: <number>
AI_REVIEW_AUTO_FIXABLE_BLOCKING_COUNT: <number>
AI_REVIEW_NON_AUTO_FIXABLE_BLOCKING_COUNT: <number>
AI_REVIEW_SHOULD_FIX_COUNT: <number>
AI_REVIEW_SUGGESTION_COUNT: <number>
AI_REVIEW_CURRENT_PRD: <current PRD>
AI_REVIEW_CURRENT_SLICE: <slice id and name>
AI_REVIEW_AUTO_FIXABLE_BLOCKING_ISSUES:
- <issue or None>
AI_REVIEW_NON_AUTO_FIXABLE_BLOCKING_ISSUES:
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
- AI_REVIEW_AUTO_FIXABLE_BLOCKING_COUNT is 0
- AI_REVIEW_NON_AUTO_FIXABLE_BLOCKING_COUNT is 0
- no required check failed because of this slice
- implementation documents are consistent
- current slice acceptance is satisfied

Never set AI_REVIEW_CAN_RELEASE to Yes just because the implementation is mostly correct.
