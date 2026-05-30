---
name: frontend-ux-flow-review
description: Use this skill after implementing or modifying user-facing frontend workflows. It reviews whether the user flow is complete, understandable, recoverable, and consistent across search, filters, create, edit, delete, export, batch actions, modals, drawers, and navigation.
---

# Frontend UX Flow Review Skill

## Purpose

Review whether the implemented workflow is actually usable, not just technically present.

This skill checks what the user sees, clicks, waits for, cancels, retries, and recovers from.

## Required Inputs

Inspect:

- changed page/component code
- current PRD slice
- acceptance checklist
- related service methods
- current route behavior
- permission/disabled logic

## Review Areas

### 1. Entry and Orientation

- User can understand what the page is for within 3 seconds.
- Main entry points are visible and not ambiguous.
- Page title, tabs, cards, or panels match PRD naming.
- If the user has no permission, the page does not leak data.

### 2. Search and Filter Flow

- Search trigger is clear.
- Enter key and search button behavior are consistent.
- Reset actually clears filters and returns to page 1.
- Filtered-empty state differs from true empty state.
- Advanced filters remain effective when collapsed.
- Current filters are visible or recoverable.

### 3. Create / Edit Flow

- Opening trigger is clear.
- Initial values are correct.
- Required fields are clear.
- Submit validates before service call.
- Submit button shows loading and prevents duplicate submit.
- Success closes or resets according to PRD.
- Failure preserves user input and shows actionable error.

### 4. Delete / Disable / Destructive Flow

- Requires confirmation.
- Shows target name and impact.
- Dangerous actions use clear warning text.
- Blocking conditions are explained.
- Disabled destructive actions show reason.
- Failure does not make UI inconsistent.

### 5. Modal / Drawer Flow

- Close, cancel, confirm, and mask-close behavior are clear.
- Unsaved changes prompt appears when required.
- State resets after close.
- Opening another record does not show stale data.
- Loading and error states are available.

### 6. Navigation and Jump Flow

- Cards and buttons navigate to the right route.
- Route query/filter state is preserved when required.
- No-permission target navigation is disabled or clearly explained.
- Back/close behavior does not lose unrelated page state.

### 7. Recovery and Feedback

- User gets feedback after every meaningful action.
- Retry is available for load failures.
- Partial success is visible for batch actions.
- Error messages say what happened and what to do next.

## Issue Classification

- Blocking: user cannot complete the PRD flow.
- Should Fix: flow works but is confusing or inconsistent.
- Suggestion: better UX but not required for current slice.

## Required Output

Add a UX Flow Review section:

- UX Flow Result: Passed / Needs Fix / Not Applicable
- Blocking issues
- Should Fix issues
- Suggestions
- Files reviewed

## Final Rule

A slice cannot be Done if the main user flow is not actually completable or recoverable.
