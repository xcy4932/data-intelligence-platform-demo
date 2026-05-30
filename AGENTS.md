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
## Multi-PRD Automation Rule

This repository contains multiple PRDs managed by `docs/implementation/MASTER_PRD_QUEUE.md`.

Codex must not hardcode any PRD implementation directory such as `docs/implementation/001_组织与身份中心`.

For every run, Codex must resolve the current PRD from `docs/implementation/CURRENT_TASK.md`.

`CURRENT_TASK.md` is the single source of truth for:
- Current PRD
- Current Implementation Directory
- Current Slice
- Status

Every PRD must have its own implementation directory under `docs/implementation/`.

Each implementation directory must contain:
- IMPLEMENTATION_MAP.md
- CURRENT_SLICE.md
- PROGRESS.md
- ACCEPTANCE_CHECKLIST.md
- DECISIONS.md
- SLICE_SELF_REVIEW.md
- logs/

When the current PRD is completed and verified:
1. Mark the current PRD as Verified in `MASTER_PRD_QUEUE.md`.
2. Find the next PRD whose status is Not Started or Ready.
3. Create its implementation directory if missing.
4. Initialize the required implementation documents.
5. Update `CURRENT_TASK.md` to point to the next PRD and its implementation directory.
6. Do not implement the first slice of the next PRD in the same run. The next slice must start in a new Codex run.

Each Codex run may implement only one smallest coherent slice.

An external shell loop may call Codex repeatedly, but Codex itself must not implement multiple slices in one run.

## AI Second-Pass Review Rule

When a slice is marked `Human Review Required`, automation may run a separate AI second-pass review using read-only sandbox mode.

The AI second-pass review must:
- inspect the actual git diff;
- verify current slice boundaries;
- verify acceptance criteria;
- verify document consistency;
- verify that no future slice was implemented early;
- output a machine-readable release decision.

If AI second-pass review returns:
- `AI_REVIEW_FINAL_STATUS: Passed`
- `AI_REVIEW_CAN_RELEASE: Yes`

then a separate release-state update pass may mark the current slice as Done and advance to the next slice.

The release-state update pass may modify only implementation documents and must not modify source code.

If AI second-pass review returns Needs Fix, Blocked, or cannot make a clear release decision, automation must stop.

## PRD Slice Automation Rule

When running in automated mode, Codex must still implement only one smallest coherent implementation slice per run.

Codex may update the implementation documents to mark the next slice as Ready, but must not implement the next slice in the same run.

Automation may continue only through an external shell loop that starts a new Codex run for each slice.

Codex must stop and mark Human Review Required when a slice touches shared infrastructure, including:
- service contracts
- route guards
- permission matrix
- audit log mechanism
- cross-page refresh mechanism
- global state
- deletion or batch operation logic
- data export logic
- import/export logic
- authentication or authorization logic
- License logic
- security-sensitive behavior

Codex must stop on Needs Fix, Blocked, Failed, Human Review Required, or any unclear PRD boundary unless the external automation explicitly invokes AI second-pass review.

## Frontend Quality Skill Rule

For frontend PRD slices, Codex should use the following quality review skills when available:

- frontend-ui-layout-review
- frontend-ux-flow-review
- frontend-code-quality-review
- data-table-form-usability-review
- frontend-accessibility-review
- frontend-performance-review

Issues found by these skills must be classified as:

- Blocking: must fix before the slice can be Done.
- Should Fix: fix if it is within the current slice and safe.
- Suggestion: record only; do not expand the current slice just to implement suggestions.

Codex must not use quality review suggestions as an excuse to implement future slices or redesign unrelated modules.

## Review Loop Limit Rule

For PRD mapping quality review, automation may run review/refine loops, but the maximum number of rounds must be explicitly provided by the shell script. The recommended maximum is 3.

For implemented development slices, AI second-pass review may run at most once per slice. If AI second-pass review returns Needs Fix, Blocked, or AI_REVIEW_CAN_RELEASE: No, automation must stop. Codex must not automatically enter a repair-review loop for the same implemented slice unless the user explicitly requests it.

Within one implementation run, Codex may fix self-review issues once if they are within the current slice. If issues remain after one fix attempt, mark Needs Fix or Human Review Required and stop.

## Development Slice AI Repair Loop Rule

For implemented development slices, AI second-pass review may be followed by a limited repair-review loop.

Default rule:
- AI second-pass review may run first.
- If it finds Blocking issues that are clearly inside the current slice, Codex may run a repair pass.
- After repair, AI second-pass review may run again.
- The maximum repair rounds must be controlled by the shell script.
- Recommended default maximum: 2 repair rounds per slice.
- Absolute recommended maximum for complex slices: 3 repair rounds per slice.

Repair pass rules:
- Repair only Blocking issues.
- Do not repair Suggestions.
- Do not expand the current slice.
- Do not implement future slices.
- Do not modify unrelated files.
- Do not perform broad refactors.
- Do not change product decisions.
- If the fix requires re-slicing, product judgment, broad architecture changes, or future-slice implementation, stop and mark Needs Fix or Blocked.

Release rule:
A slice can be automatically released only when:
- AI_REVIEW_FINAL_STATUS: Passed
- AI_REVIEW_CAN_RELEASE: Yes
- AI_REVIEW_BLOCKING_COUNT: 0

If the repair-review loop exceeds the configured maximum rounds and the slice is still not releasable, automation must stop.
