---
name: frontend-code-quality-review
description: Use this skill after any frontend implementation slice. It reviews Vue/TypeScript code quality, component size, state structure, composable extraction, service/type/mock separation, naming, duplication, and maintainability.
---

# Frontend Code Quality Review Skill

## Purpose

Review code maintainability, not just whether the feature works.

This project has many PRDs and many slices, so each slice must avoid creating long-term frontend debt.

## Required Inputs

Inspect:

- changed Vue files
- changed TypeScript files
- changed services
- changed types
- changed mocks
- nearby existing implementations
- package checks

## Review Areas

### 1. Component Size and Responsibility

- Component has a clear purpose.
- Large page components are split into business components when appropriate.
- Pure visual components do not contain heavy business rules.
- Business logic is not buried inside template expressions.
- Reusable logic is extracted into composables or helpers when repeated.

### 2. State Management

- Loading, error, empty, success, and submitting states are explicit.
- State names are clear.
- No unnecessary duplicate state.
- No stale state after modal/drawer close.
- Watchers are not overused.
- Computed values are used for derived state.

### 3. TypeScript Quality

- Avoids `any` unless justified.
- Uses existing shared types where available.
- Service payload and response types are explicit.
- Enums/status values are not hardcoded repeatedly.
- Function return types are clear for non-trivial functions.

### 4. Service / Type / Mock Separation

- API/service calls stay in service files.
- Types stay in type files.
- Mock data stays in mock files.
- Vue components do not manually simulate backend business rules if service already owns them.
- Permission logic reuses existing permission helpers.

### 5. Naming and Readability

- Names reflect business meaning.
- Boolean names are clear.
- Handlers use consistent naming.
- No misleading names like `data`, `list`, `temp`, `handleClick` when more specific names are needed.
- Error messages are readable.

### 6. Duplication

- Repeated columns, filters, validators, action decision rules, and status tags should be extracted if repeated.
- Avoid copy-paste divergence between list and detail pages.
- Do not introduce duplicate constants already available elsewhere.

### 7. Imports and Dead Code

- No unused imports.
- No unused exports.
- No unreachable code.
- No leftover console logs.
- No TODO-only implementation.
- No fake placeholder actions.

## Issue Classification

- Blocking: code likely breaks behavior, type safety, or maintainability immediately.
- Should Fix: safe to improve within current slice.
- Suggestion: record for later refactor if outside slice.

## Required Output

Add a Code Quality Review section:

- Code Quality Result: Passed / Needs Fix
- Blocking issues
- Should Fix issues
- Suggestions
- Files reviewed

## Final Rule

Do not mark Done if code contains fake wiring, broken separation, unsafe `any` usage in important contracts, or duplicated business logic that will cause immediate inconsistencies.
