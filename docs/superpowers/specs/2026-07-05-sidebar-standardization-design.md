# Sidebar Standardization Design

Date: 2026-07-05

## Goal

Standardize workspace sidebar navigation across Suar by using one shared parent/child navigation model for:

- `admin_sidebar.svelte`
- `app_sidebar.svelte`
- `organization_sidebar.svelte`

This work explicitly does not merge page-local context panels into the global workspace sidebar layer.

## Current Problems

- `control_sidebar.svelte` renders parent/child navigation inline and duplicates nav logic.
- `nav_group.svelte` contains overlapping active-state and item-shape logic.
- `command_menu.svelte` reimplements role-based filtering that also exists in `app_sidebar.svelte`.
- Query-aware active matching matters for admin screens like audit logs, but matching behavior is not centralized.
- The codebase mixes global workspace navigation with page-local sidebars in naming, which makes future refactors harder.

## Reference Pattern

`ancarat-bo` uses a clear split:

- one shared nav schema
- one renderer for parent/child sections
- thin per-workspace wrappers

Suar should follow the same separation while preserving its Svelte layout and org/project switcher behavior.

## Architecture

### 1. Shared navigation schema

Current multi-app split keeps one app-local source of truth per shell:

- `inertia/apps/user/shared/components/navigation_types.ts`
- `inertia/apps/org/shared/components/navigation_types.ts`
- `inertia/apps/admin/shared/components/navigation_types.ts`

### 2. Shared navigation helpers

Current helper files live beside each app's navigation schema:

- `inertia/apps/user/shared/components/navigation_helpers.ts`
- `inertia/apps/org/shared/components/navigation_helpers.ts`
- `inertia/apps/admin/shared/components/navigation_helpers.ts`

These helpers own:

- icon mapping
- nav item guards
- active-state detection
- role-based filtering for main navigation

### 3. Shared renderer for workspace sidebar navigation

Create a dedicated renderer component for the control sidebar visual style:

- receives `NavGroup[]`
- handles parent expand/collapse
- highlights active child and parent states
- supports exact query matching for routes like `/admin/audit-logs?view=overview`

### 4. Shell keeps workspace chrome only

`control_sidebar.svelte` should focus on:

- brand/header area
- ticket/workspace metadata
- org switcher
- project switcher
- footer user card

It should stop owning raw parent/child nav rendering logic.

## Boundary Rule

Two sidebar classes must stay separate:

### Global workspace sidebar

Persistent navigation for app/admin/org workspace switching.

### Context sidebar

Page-local information panels such as:

- audit log evidence folders/pivots
- task metadata sidebars
- detail panels

These may share visual tokens later, but they should not reuse the global nav renderer blindly.

## Migration Order

1. Centralize shared helpers and renderer
2. Migrate `control_sidebar.svelte`
3. Keep `admin_sidebar.svelte`, `app_sidebar.svelte`, `organization_sidebar.svelte` as thin wrappers
4. Update `command_menu.svelte` to reuse shared role filtering
5. Align `nav_group.svelte` with shared active-state helpers
6. Audit page-local sidebars separately after workspace nav is stable

## Risk

GitNexus CLI impact snapshot before editing:

- `ControlSidebar`: MEDIUM, 6 direct callers
- `adminNavigation`: MEDIUM, 6 direct callers
- `mainNavigation`: MEDIUM, 5 direct callers
- `organizationNavigation`: MEDIUM, 9 direct callers

Main regression risk:

- active-state mismatch
- mobile close behavior after navigation
- settings and audit-log query route highlighting

## Verification

- Storybook fixtures for control sidebar and nav group still render
- Workspace layouts still mount correct sidebar wrappers
- Query-based admin entries highlight correct active child
- Command menu still shows role-filtered navigation targets
