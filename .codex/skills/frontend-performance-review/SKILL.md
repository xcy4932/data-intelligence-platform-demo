---
name: frontend-performance-review
description: Use this skill after implementing or modifying data-heavy frontend pages, tables, charts, filters, subscriptions, polling, cross-page refresh, or expensive computed logic. It reviews performance, unnecessary requests, large render risks, cleanup, and refresh efficiency.
---

# Frontend Performance Review Skill

## Purpose

Review whether the frontend implementation is efficient enough for a BI/data platform.

Focus on avoiding unnecessary requests, expensive renders, stale subscriptions, and inefficient data-heavy UI.

## Review Areas

### 1. Request Efficiency

- Page does not issue duplicate initial requests.
- Search is triggered by Search button or Enter when PRD requires it.
- Reset does not cause redundant multiple reloads.
- Filters do not trigger excessive requests unless intended.
- Dependent option loading is scoped and cached when reasonable.

### 2. Table and List Performance

- Large lists are paginated.
- Page size options are controlled.
- Heavy client-side filtering is avoided for backend-like data unless mock-only.
- Computed values over large arrays are not repeatedly recalculated unnecessarily.
- Row keys are stable.

### 3. Chart Performance

- Charts render only when data is ready.
- Chart options are computed cleanly.
- Data transform logic is not duplicated across render cycles.
- Empty chart state avoids rendering broken chart shells.

### 4. Subscription and Cleanup

- Event subscriptions are unsubscribed on component unmount.
- Timers are cleared.
- Watchers do not create repeated subscriptions.
- Cross-page refresh listens only to relevant topics.
- Refresh does not reload unrelated data.

### 5. Component Render Efficiency

- Avoids excessive nested reactive objects when simple refs are enough.
- Avoids inline object/function creation in large repeated rows when problematic.
- Avoids deep watchers unless necessary.
- Does not keep stale heavy data after modal/drawer close when not needed.

### 6. Build and Bundle Awareness

- Avoids introducing large new dependencies unless justified.
- Reuses existing libraries.
- Does not import full libraries for one small function.

## Issue Classification

- Blocking: implementation can cause obvious repeated requests, memory leaks, or unusable large-table behavior.
- Should Fix: performance issue inside current slice.
- Suggestion: future optimization.

## Required Output

Add a Performance Review section:

- Performance Result: Passed / Needs Fix / Not Applicable
- Blocking issues
- Should Fix issues
- Suggestions
- Files reviewed

## Final Rule

Do not mark Done if the slice creates duplicate requests, uncleaned subscriptions, unbounded table rendering, or refreshes unrelated large data on every small change.
