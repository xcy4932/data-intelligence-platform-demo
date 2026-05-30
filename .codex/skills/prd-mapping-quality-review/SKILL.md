---
name: prd-mapping-quality-review
description: Use this skill after PRD mapping/slicing. It reviews whether IMPLEMENTATION_MAP.md is granular, implementable, correctly ordered, dependency-aware, UI/UX complete, and safe for one-slice-per-Codex-run automation.
---

# PRD Mapping Quality Review Skill

## Purpose

Review the quality of PRD slicing before any code implementation starts.

The goal is to prevent oversized slices, vague implementation plans, missing dependencies, missing UI states, missing permission/audit/refresh requirements, and unsafe automation.

## Required Inputs

Always read:

- AGENTS.md
- docs/implementation/MASTER_PRD_QUEUE.md
- docs/implementation/CURRENT_TASK.md if available
- current PRD file
- current PRD implementation directory
- IMPLEMENTATION_MAP.md
- CURRENT_SLICE.md
- PROGRESS.md
- ACCEPTANCE_CHECKLIST.md
- DECISIONS.md

## Review Dimensions

### 1. Coverage

Check whether the mapping covers the entire PRD.

- Every page in the PRD has slices.
- Every major user flow has slices.
- Every create/edit/delete/import/export/batch flow has slices.
- Every list/table/filter/detail/modal/drawer has slices.
- Every permission-sensitive flow has slices.
- Every audit-log requirement has slices.
- Every refresh/data consistency requirement has slices.
- Final acceptance criteria are mapped.

### 2. Granularity

Check whether every slice is small enough for one Codex run.

Bad oversized slices include:

- Complete user management page
- Implement dashboard
- Implement all CRUD
- Implement full settings center
- Implement list, form, detail, export, delete together
- Implement all permissions
- Implement all audit logs

Good slices split:

- page shell
- service/type/mock foundation
- filter area
- table and pagination
- row actions
- create modal base fields
- form validation
- relation selectors
- submit/save behavior
- detail drawer frame
- tab content
- destructive action confirmation
- import upload
- import preview validation
- import submit/result
- export confirmation
- batch action result
- audit log write
- audit log display
- cross-page refresh

### 3. Ordering and Dependencies

Check whether the order is safe.

- Foundation before pages.
- Types before mock/service.
- Routes before page implementation.
- Permission utilities before permission-dependent UI.
- Common state components before repeated list/detail pages.
- List page before row actions.
- Detail drawer before edit/delete flows.
- Write operation before audit coverage only if audit hooks are available.
- Import preview before import submit.
- Batch operations after single operations.
- Final regression slice last.

### 4. Boundary Clarity

Every slice must clearly state:

- scope
- non-scope
- affected files
- affected pages
- affected components
- affected data objects
- affected service methods
- refresh requirements
- audit log requirements
- permission requirements
- validation rules
- UI states
- interaction rules
- acceptance criteria

### 5. UI/UX Completeness

For UI slices, verify that mapping requires:

- default state
- loading state
- empty state
- filtered-empty state
- error state
- 403/no-permission state
- 404/not-found state where relevant
- disabled action state
- success feedback
- failure feedback
- retry behavior
- unsaved-change confirmation where relevant

### 6. Risk Isolation

High-risk logic should be isolated into explicit slices:

- permission matrix
- route guard
- service contract
- mock seed
- audit log mechanism
- cross-page refresh
- deletion
- batch operations
- import/export
- License logic
- authentication/security
- data ownership/scope filtering

### 7. Automation Safety

Check whether the mapping is safe for automatic implementation:

- no slice requires product judgment that is not documented
- no slice depends on undocumented UI behavior
- no slice bundles future PRD features
- no slice relies on "to be determined"
- no slice asks Codex to implement broad architecture changes without boundaries

## Score

Return a score from 0 to 100.

Suggested interpretation:

- 90-100: Good enough to start implementation.
- 75-89: Usable, but should refine before long automation.
- 60-74: Too risky; refine before implementation.
- Below 60: Mapping is not acceptable.

## Required Output

The review must end with machine-readable lines:

MAPPING_REVIEW_FINAL_STATUS: Passed | Needs Refinement | Blocked
MAPPING_REVIEW_SCORE: <0-100>
MAPPING_REVIEW_CAN_IMPLEMENT: Yes | No
MAPPING_REVIEW_MAIN_PROBLEMS:
- <problem 1 or None>
MAPPING_REVIEW_REQUIRED_REFINEMENTS:
- <refinement 1 or None>
MAPPING_REVIEW_GOOD_POINTS:
- <good point 1 or None>
MAPPING_REVIEW_SUMMARY:
- <short summary>

## Final Rule

Do not allow implementation to start unless:

- MAPPING_REVIEW_FINAL_STATUS is Passed
- MAPPING_REVIEW_CAN_IMPLEMENT is Yes
- MAPPING_REVIEW_SCORE is at least 90
