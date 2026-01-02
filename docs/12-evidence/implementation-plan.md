# Implementation Plan — Realm isolation and board-first workspaces

**Updated:** 2026-07-28  
**Source of truth:** `frontend-ui-audit-2026-07-26.md`

## Non-negotiable invariants

- System Admin is a separate principal, security realm, shared-data contract, layout, and URL space.
- User realm has Personal, Organization Management, and per-project Project Workspaces.
- No Admin-mode bridge or mixed System/User authorization object.
- Organization Management does not duplicate Project boards.
- Project Workspace has exactly four shared boards.
- System Administration has one AI dispute progress board.
- Detail/create/history/inbox behavior is expressed through board card rooms, modals, and filters.

## Phase A — Realm isolation

**Status:** implemented; targeted regression verification complete.

- Return `SystemAuthUser` only for `/admin/*`.
- Return `WorkspaceAuthUser` only for the User realm.
- Remove `isAdmin`, `canSwitchToAdmin`, Admin mode, and `/admin/toggle`.
- Remove organization/project data from Admin shared props.
- Remove System role/permissions from User and Org shared props.
- Add explicit `realm: 'system' | 'user'`.

Acceptance:

- A System request cannot observe `workspaceAccess`.
- A User request cannot observe System authorization.
- Admin sidebar never offers Personal/Org/Project switching.
- User workspace switcher never offers Admin.

## Phase B — Capability-based workspace entry

**Status:** implemented; targeted regression verification complete.

- Add `workspaceAccess` for Personal, Organization Management, and accessible projects.
- Restrict an ordinary organization member’s project list to stakeholder/member projects.
- Allow organization owner/admin portfolio policy without leaking it to ordinary members.
- Clear inaccessible `current_project_id`.
- Make switchers capability-driven instead of comparing display role strings.

Acceptance:

- Personal is always available.
- Organization Management appears only when permitted.
- Project switcher contains only accessible projects.
- Switching organization lands on `/org` for governance actors and `/projects` for ordinary members.

## Phase C — Project Workspace

**Status:** implemented.

- Add Project layout/sidebar mode.
- Canonicalize project overview and supporting sections under `/projects/:projectId`.
- Add canonical Task, Task Review, Assigner Review, and Environment Review routes.
- Preserve current project section when switching projects.
- Make Organization portfolio open Project Workspace.

Acceptance:

- Project sidebar always identifies the selected project.
- Exactly four board entries are rendered.
- Project roles change allowed actions, not the board route.
- “All projects” and optional “Organization Management” are explicit exits.

## Phase D — Board-first interaction

**Status:** implemented.

- Task board always renders Kanban; remove list-mode UI.
- Open create, detail, edit, delete, submission, and status actions as overlays/card rooms.
- Use `task_id` for task deep links.
- Use `workflow_id` for sprint-review deep links.
- Add “Waiting on me” as a Task Review board filter.
- Use `status=done` for history rather than a history page.
- Render all eight review workflow lanes.

Acceptance:

- Task board is also the task list.
- Task create links from roles/operating model open `?create=1` on the project board.
- Legacy task create/detail/edit and Organization task-detail URLs redirect to the matching Project board overlay.
- Done creates/reuses a task review in `awaiting_review`.
- No card disappears in AI or terminal review states.

## Phase E — Isolated System Admin board

**Status:** implemented.

- Convert `/admin/disputes` from list/table to Kanban.
- Cover evidence collection, reported, Admin review, AI review, and terminal states.
- Keep `/admin/disputes/:id` as the selected card’s decision room.
- Keep Admin comments under `/api/admin/reviews/disputes/:disputeId/comments`.
- Commit dispute resolution transactions before writing operational checkpoints.
- Retire the AI operator page.
- Retire the Admin reverse-review history page.

Acceptance:

- Only System Admin middleware can reach the board.
- The board receives no current organization/project workspace contract.
- The operator alias stays inside the System realm; Admin reverse-review page/API are absent.

## Phase F — Legacy route and documentation cleanup

**Status:** implemented; targeted verification complete.

- Remove retired review/history/inbox routes instead of preserving aliases.
- Remove retired reverse-review history GET APIs and their obsolete contract tests.
- Retain task compatibility redirects only where old bookmarks still require them.
- Remove old links from sidebars, dashboards, settings, profile, project actions, and organization overview.
- Replace the eight evidence artifacts with this board-first contract.
- Add route-isolation and redirect cases to the test matrix.

## Verification

Run in this order:

1. Backend unit tests for realm shared props, organization/project switching, and retired redirects.
2. Backend integration tests for project access and Done → review workflow.
3. Vitest component tests for navigation, switchers, four Project boards, and Admin Kanban.
4. Svelte/TypeScript targeted checks for changed files.
5. Route inventory assertions.
6. `gitnexus detect-changes` to confirm affected scope.

Global checks may still report unrelated failures from the existing dirty worktree. Handoff must distinguish targeted green checks from pre-existing failures.

Verification snapshot:

- Backend policy/source unit: 33/33 passed.
- Admin dispute, retired-route, and observability integration: 17/17 passed.
- Targeted frontend component/source/i18n: 121/121 passed across 19 files.
- Canonical route assertion: five boards present, zero retired GET surfaces, Admin comment API isolated.
- Playwright discovery: 12 canonical-board tests across five files.
- Targeted ESLint: passed.
- Full `tsc --noEmit`: passed.
- Board/realm EN and VI translation keys are complete; the global integrity test remains red only on unrelated concurrent surfaces.
