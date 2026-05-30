---
name: frontend-accessibility-review
description: Use this skill after implementing or modifying user-facing frontend UI. It reviews accessibility and clarity: labels, tooltips, disabled reasons, keyboard-friendly controls, color-independent status, form errors, modal semantics, and understandable interactive elements.
---

# Frontend Accessibility and Clarity Review Skill

## Purpose

Improve accessibility and general clarity for enterprise users.

This skill does not require perfect WCAG certification, but it prevents common problems that make UI confusing or hard to operate.

## Review Areas

### 1. Labels and Text

- Inputs have visible labels or clear accessible labels.
- Icon-only buttons have tooltip or text alternative.
- Status tags include text, not color only.
- Error messages are specific.
- Empty states explain what happened.

### 2. Disabled and Permission States

- Disabled buttons explain why when visible.
- Hidden vs disabled strategy follows PRD.
- No-permission states do not leak sensitive data.
- Tooltip text is understandable.

### 3. Forms

- Required fields are clear.
- Field errors appear near the field.
- Validation errors do not only appear as global toast.
- Password or security fields avoid exposing sensitive values.

### 4. Modals and Drawers

- Title clearly describes action.
- Confirm and cancel labels are specific.
- Dangerous confirmation text is explicit.
- Close behavior is clear.
- Unsaved-change confirmation appears when needed.

### 5. Keyboard and Focus Clarity

- Important actions are reachable through standard controls.
- Avoid clickable divs when button/link is appropriate.
- After modal open, first meaningful input/action is clear.
- After close, user returns to a predictable state.

### 6. Color and Visual Dependence

- Do not rely only on red/green/yellow.
- Status has text label.
- Warning and error states include clear copy.

## Issue Classification

- Blocking: user cannot understand or operate a required action.
- Should Fix: clarity/accessibility improvement inside current slice.
- Suggestion: optional enhancement.

## Required Output

Add an Accessibility Review section:

- Accessibility Result: Passed / Needs Fix / Not Applicable
- Blocking issues
- Should Fix issues
- Suggestions
- Files reviewed

## Final Rule

Do not mark Done if important actions are icon-only without explanation, destructive actions are ambiguous, or disabled controls give no reason when the user needs to understand them.
