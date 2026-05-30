---
name: prd-slice-self-review
description: Use this skill after implementing any PRD slice. The agent must review its own changes against the implementation map, slice boundary, frontend interaction rules, permissions, state handling, and project checks before marking the slice Done.
---

# PRD Slice Self Review Skill

## Purpose

Before marking any PRD slice as Done, review the implementation like a senior product engineer.

Do not rely on user review as the first quality gate.

## Required Inputs

Always read:

- AGENTS.md
- docs/implementation/MASTER_PRD_QUEUE.md
- docs/implementation/CURRENT_TASK.md
- current PRD IMPLEMENTATION_MAP.md
- current PRD PROGRESS.md
- current PRD CURRENT_SLICE.md
- files changed in this run
- package.json scripts

## Boundary Check

Answer:

- Did this run implement only the current slice?
- Did it modify files outside the expected scope?
- Did it implement a later slice early?
- Did it leave fake buttons, TODO-only behavior, or unreachable UI?

If any answer is risky, mark Human Review Required.

## Acceptance Checklist Check

For the current slice:

- Copy the checklist items from IMPLEMENTATION_MAP.md.
- Mark each item:
  - Passed
  - Failed
  - Partial
  - Not Applicable
- Explain every Failed or Partial item.

Do not mark the slice Done unless all required checklist items are Passed or explicitly Not Applicable.

## Frontend Interaction Check

If the slice touches UI, verify:

- loading state
- empty state
- filtered-empty state
- error state
- 403 state
- 404 state
- disabled action state
- success feedback
- failure feedback
- retry behavior
- no fake action buttons

If not relevant to this slice, mark as Not Applicable.

## Permission Check

If the slice touches permissions, verify:

- system_admin behavior
- organization_admin behavior
- user_admin behavior
- normal_user behavior
- license disabled behavior
- no third-party identity source behavior if relevant
- route/menu/action consistency

## Data Contract Check

If the slice touches types, mock, or service, verify:

- all exported types compile
- mock IDs reference existing objects
- service returns cloned data
- service returns ServiceResult<T>
- errors are typed and meaningful
- write methods either persist correctly or clearly document non-persistence

## Commands

Run available commands:

- npm run type-check
- npm run build
- npm run lint if available
- npm run test if available

If a command does not exist, record Not Available.

## Required Output File

Create or update:

docs/implementation/<current-prd>/SLICE_SELF_REVIEW.md

The report must include:

1. Slice ID
2. Summary
3. Files changed
4. Boundary check
5. Acceptance checklist result
6. Frontend interaction check
7. Permission check
8. Data contract check
9. Commands run
10. Issues fixed during self-review
11. Remaining risks
12. Final status:
   - Done
   - Needs Fix
   - Human Review Required

## Automatic Review Decision

Do not rely on `CURRENT_SLICE.md` manually declaring `Human Review: Yes` or `Human Review: No`.

Infer whether human review is required from:

- current slice scope
- changed files
- risk level
- acceptance checklist result
- commands run
- whether shared infrastructure or high-risk logic was changed

Classify risk as:

- Low
- Medium
- High

Human review is required for all High risk slices.

High risk includes changes to:

- global types
- mock seed data
- service contracts
- permission rules
- route guards
- menu visibility
- cross-page refresh
- audit logs
- deletion flows
- batch operations
- import/export logic
- License logic
- security-sensitive behavior

Write the result to `SLICE_SELF_REVIEW.md` as:

- Review Risk Level: Low / Medium / High
- Human Review Required: Yes / No
- Reason
- Recommended files to upload   

## Final Rule

Only update IMPLEMENTATION_MAP.md and PROGRESS.md to Done if SLICE_SELF_REVIEW.md final status is Done.

If the slice changes global types, mock data, service contracts, route guards, permission rules, deletion flows, batch operations, License logic, or audit logs, mark Human Review Required even if self-review passes.