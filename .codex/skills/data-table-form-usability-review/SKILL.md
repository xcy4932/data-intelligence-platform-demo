---
name: data-table-form-usability-review
description: Use this skill when a slice implements or modifies tables, filters, pagination, batch actions, forms, validation, modals, drawers, import/export, or admin CRUD pages in a BI/data platform.
---

# Data Table and Form Usability Review Skill

## Purpose

Review data-heavy admin UI patterns such as tables, filters, forms, pagination, batch operations, import/export, modals, and drawers.

This project is a BI/data platform, so table and form usability is critical.

## Table Review

Check:

- Table has stable row key.
- Columns match PRD.
- Column labels are clear.
- Important identity columns are clickable only when detail is implemented.
- Status values use readable labels.
- Row actions follow permission and state rules.
- Disabled row actions show reason when visible.
- Destructive row actions require confirmation.
- Pagination default and page-size options match PRD.
- Filter change resets to page 1 when required.
- Refresh preserves filters when required.
- Empty state and filtered-empty state are different.
- Loading and error states are implemented.
- Wide tables handle overflow or fixed action columns.
- Batch action bar only appears when rows are selected.
- Batch results show success/failure details.

## Form Review

Check:

- Initial values are correct.
- Required fields are marked.
- Validation rules match PRD.
- Validation messages are specific and close to the field.
- Submit validates before service call.
- Submit loading prevents duplicate submission.
- Cancel and close behavior match unsaved-change rule.
- Submit success closes/resets according to PRD.
- Submit failure keeps input and shows useful error.
- Edit mode and create mode are not confused.
- Read-only external/synced fields are clearly locked and explain why.

## Modal / Drawer Review

Check:

- Opening trigger is real.
- Confirm action is real.
- Cancel action is real.
- Close action is real.
- State resets after close.
- Loading, empty, error, no-permission states are handled.
- Drawer switching between records does not show stale data.

## Import / Export Review

Check:

- Export confirms before starting.
- Export uses current filters, not only current page.
- Export limit error is handled.
- Import validates file type, size, headers, and rows.
- Import preview shows row-level errors.
- Partial success is visible.

## Issue Classification

- Blocking: table/form main flow cannot be used.
- Should Fix: usability gap inside current slice.
- Suggestion: improvement for future slice.

## Required Output

Add a Table/Form Usability Review section:

- Table/Form Result: Passed / Needs Fix / Not Applicable
- Blocking issues
- Should Fix issues
- Suggestions
- Files reviewed

## Final Rule

Do not mark a table/form slice Done if its main CRUD, filter, pagination, validation, or reset behavior is incomplete.
