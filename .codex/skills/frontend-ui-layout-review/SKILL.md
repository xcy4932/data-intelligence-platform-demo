---
name: frontend-ui-layout-review
description: Use this skill after implementing or modifying any frontend page, layout, dashboard, list page, detail page, modal, drawer, or component. It reviews visual hierarchy, spacing, information density, layout consistency, Naive UI usage, and overall professional BI/data-platform UI quality.
---

# Frontend UI Layout Review Skill

## Purpose

Review the implemented frontend UI like a senior data-platform product designer and frontend engineer.

This skill focuses on whether the page looks clean, structured, professional, and consistent with an enterprise BI/data platform.

Do not expand scope or redesign unrelated pages.

## Required Inputs

Always inspect:

- changed Vue components
- changed business components
- related route/page shell
- existing nearby pages for style consistency
- AGENTS.md
- current PRD slice acceptance criteria

## Review Scope

Check the following:

### 1. Page Structure

- Page title is clear.
- Page description or context is present when needed.
- Primary actions are placed consistently, usually top-right.
- Content is divided into clear sections.
- Cards, filters, tables, charts, and panels have clear hierarchy.
- Page does not feel like a raw stack of components.

### 2. Visual Hierarchy

- Primary information is visually stronger than secondary information.
- Primary actions are more prominent than secondary actions.
- Destructive actions are visually separated from normal actions.
- Empty/error/no-permission states are easy to distinguish.
- Important counts, status, and alerts are easy to scan.

### 3. Spacing and Density

- Uses consistent padding, margins, and gaps.
- Avoids cramped toolbars.
- Avoids overly wide forms.
- Avoids very long single-line controls when grouped layout is better.
- Uses grid/flex layout intentionally.
- Tables and filters have breathing room.

### 4. Component Consistency

- Reuses existing Naive UI components and existing business components.
- Uses consistent card, table, modal, drawer, tag, button, and tooltip patterns.
- Does not introduce random custom styles when existing project style is enough.
- Avoids one-off visual patterns unless justified.

### 5. Responsive Layout

- Page remains usable on common laptop widths.
- Filter sections wrap correctly.
- Action buttons do not overflow.
- Table containers handle horizontal overflow if columns are many.
- Modal/drawer widths are reasonable.

### 6. Data Platform Style

- Statistics cards, filter bars, tables, and charts should feel like one coherent enterprise data product.
- Avoid consumer-app decorative styling.
- Avoid visual noise.
- Avoid unclear icon-only controls without tooltips.

## Output Classification

For each issue classify as:

- Blocking: must fix before marking the slice Done.
- Should Fix: fix if it is within current slice and safe.
- Suggestion: record only; do not fix in current slice if it causes scope creep.

## Required Output

Add a UI Layout Review section to the slice self-review or final summary:

- UI Layout Result: Passed / Needs Fix / Not Applicable
- Blocking issues
- Should Fix issues
- Suggestions
- Files reviewed

## Final Rule

Do not mark layout review Passed if:

- the page is visually broken;
- important actions are hidden or misleading;
- fake controls are visible;
- spacing makes the page hard to use;
- the UI does not match surrounding project style.
