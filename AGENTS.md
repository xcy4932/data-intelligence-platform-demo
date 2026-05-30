# AGENTS.md

## Project Role

This is a data intelligence / BI / data platform frontend project.

The agent must behave like a senior frontend/product engineer, not a simple code generator.

## Core Development Rule

For long PRD tasks, never implement the entire PRD in one pass.

Always work in small implementation slices.

Each run may implement only one smallest coherent slice.

## Required Reading Before Work

Before modifying code, always read:

1. AGENTS.md
2. docs/implementation/MASTER_PRD_QUEUE.md
3. docs/implementation/CURRENT_TASK.md if it exists
4. the current PRD file
5. the current PRD implementation map and progress files if they exist
6. existing routes, components, services, types, and mock data related to the task

## PRD Implementation Files

For each PRD, create a folder under docs/implementation.

Example:

docs/implementation/001_组织与身份中心/
├── IMPLEMENTATION_MAP.md
├── PROGRESS.md
├── DECISIONS.md
├── ACCEPTANCE_CHECKLIST.md
└── CURRENT_SLICE.md

## Implementation Standard

All features must follow 产品功能逻辑级 PRD standards.

Each feature must define and implement:

- page entry
- user flow
- default state
- loading state
- empty state
- error state
- no-permission state
- disabled state
- success state
- failure state
- validation rules
- interaction logic
- data refresh logic
- acceptance criteria

## Frontend Rules

Every table must define:

- columns
- row key
- loading state
- empty state
- error state
- pagination
- search/filter behavior
- row actions
- disabled rules
- permission rules

Every form must define:

- initial values
- required fields
- validation rules
- submit behavior
- cancel behavior
- submit loading state
- success feedback
- failure feedback
- whether closing resets the form

Every modal or drawer must define:

- opening trigger
- confirm behavior
- cancel behavior
- close behavior
- reset behavior
- unsaved-change behavior when applicable

Every destructive action must require confirmation.

Do not leave fake buttons, placeholder actions, TODO-only behavior, or UI that appears functional but has no implementation.

## Architecture Rules

- Reuse existing components before creating new components.
- Reuse existing service patterns before creating new API logic.
- Keep API calls in service files.
- Keep reusable types in shared type files.
- Keep business logic out of purely visual components.
- Do not rewrite unrelated modules.
- Do not introduce large architecture changes unless explicitly requested.

## Quality Check

After every implementation slice, run available project checks from package.json, such as:

- typecheck
- lint
- test
- build

If a check fails because of the current changes, fix it before stopping.

## Progress Update

After every implementation slice, update:

- IMPLEMENTATION_MAP.md
- PROGRESS.md
- DECISIONS.md if any product or technical decision was made
- ACCEPTANCE_CHECKLIST.md
- CURRENT_TASK.md
- MASTER_PRD_QUEUE.md if PRD status changed

## Completion Report

At the end of every run, report:

1. implemented slice
2. changed files
3. PRD coverage
4. interaction states covered
5. checks run
6. remaining gaps
7. recommended next prompt

## Automatic Human Review Decision Rule

Codex must automatically decide whether human review is required after every PRD slice.

The user should not manually set `Human Review: Yes` or `Human Review: No` in `CURRENT_SLICE.md`.

Codex must infer the review requirement from:

1. Current slice scope
2. Files changed in the current run
3. Acceptance checklist result
4. Commands run
5. Whether the slice touches shared infrastructure or high-risk business logic

Codex must write the decision into:

`docs/implementation/<current-prd>/SLICE_SELF_REVIEW.md`

The report must include:

- Final Status
- Human Review Required: Yes / No
- Review Risk Level: Low / Medium / High
- Reason
- Recommended files to upload

### Risk Level Classification

Codex must classify the current slice as one of:

- Low
- Medium
- High

### High Risk Slices

Codex must classify the slice as High risk if it changes any of the following:

- Global type definitions
- Mock seed data
- Service contracts
- Permission rules
- Route guards
- Menu visibility
- Access control logic
- Shared state components
- Cross-page refresh mechanisms
- Audit log fields, action enums, storage, recording, or query behavior
- Delete flows
- Asset transfer flows
- Batch operations
- Import/export logic
- License assignment or release logic
- Security-sensitive behavior
- Data ownership or scope filtering
- Any shared utility used by multiple future slices

High risk slices must always set:

`Human Review Required: Yes`

Even if type-check and build pass.

### Medium Risk Slices

Codex must classify the slice as Medium risk if it changes:

- A full page with multiple states
- A form with validation
- A modal or drawer
- A table with row actions
- A list page with pagination, search, filtering, or export
- A read/write interaction that affects local state
- A component shared by more than one page but not global infrastructure

Medium risk slices must set:

`Human Review Required: Yes`

when any of the following is true:

- The slice touches permissions.
- The slice touches service methods.
- The slice touches route or menu behavior.
- Any acceptance item is Failed or Partial.
- Type-check, build, lint, or relevant tests fail.
- Files outside the expected slice scope were modified.
- Codex is not confident the implementation stayed within scope.

Medium risk slices may set:

`Human Review Required: No`

only when all required checks pass and no shared infrastructure was changed.

### Low Risk Slices

Codex may classify the slice as Low risk if it only changes:

- Local read-only UI
- Page copy
- Static layout
- Simple empty-state wiring
- Simple loading-state wiring
- Simple field display
- Local CSS or style adjustments
- Non-destructive UI presentation

Low risk slices may set:

`Human Review Required: No`

if all of the following are true:

- Final Status is Done.
- Type-check passed.
- Build passed.
- No unrelated files were modified.
- No global types, mock data, service, route, permission, audit, batch, delete, import/export, or License logic was changed.
- No acceptance checklist item is Failed or Partial.

### Final Status Rules

Codex must set Final Status to one of:

- Done
- Needs Fix
- Human Review Required

Codex may set Final Status to Done only when:

- The current slice stayed within scope.
- All required acceptance items passed or are clearly Not Applicable.
- Type-check passed.
- Build passed.
- Any lint/test failure is proven unrelated to the current slice.
- No blocking risk remains.

Codex must set Final Status to Needs Fix when:

- The implementation has Failed or Partial acceptance items.
- The current slice introduced type-check or build errors.
- The current slice introduced broken imports, unused exports, fake buttons, TODO-only behavior, or incomplete wiring.
- The current slice modified unrelated files but Codex can safely revert or fix them.
- A command failed because of the current slice.

Codex must set Final Status to Human Review Required when:

- Human Review Required is Yes.
- The slice is High risk.
- The slice changes shared infrastructure.
- Codex cannot confidently determine whether the changes are safe.
- The implementation requires product judgment.

### Changed Files Check

Before finalizing a slice, Codex must inspect changed files.

If changed files include paths outside the expected slice scope, Codex must either:

1. Revert unrelated changes, then continue; or
2. Mark Final Status as Human Review Required.

Examples of unrelated changes:

- A lifecycle analysis file changed during an organization identity slice.
- An unrelated dashboard file changed during a permission slice.
- Formatting-only changes occurred outside the current PRD module.
- Lint auto-fix modified files unrelated to the current slice.

### Upload Recommendation Rule

When Human Review Required is Yes, Codex must list the exact files the user should upload for review.

The list must include:

- `SLICE_SELF_REVIEW.md`
- All changed high-risk files
- `CURRENT_SLICE.md`
- `PROGRESS.md`
- `IMPLEMENTATION_MAP.md` if statuses or acceptance checklists changed

Codex must not ask the user to upload unrelated files.