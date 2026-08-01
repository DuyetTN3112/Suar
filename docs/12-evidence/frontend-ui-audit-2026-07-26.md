# Suar Frontend Architecture Audit — Board-first correction

**Audit date:** 2026-07-26  
**Architecture correction:** 2026-07-28  
**Status:** authoritative replacement for the earlier screen-heavy target

## 1. Decision

Suar has **two security realms**, not one user carrying roles across every scope:

| Realm  | Principal    | URL space                                            | Shared with the other realm? |
| ------ | ------------ | ---------------------------------------------------- | ---------------------------- |
| System | System Admin | `/admin/*`                                           | No                           |
| User   | User         | Personal, Organization Management, Project Workspace | No System role or permission |

Hard invariants:

1. A System Admin principal is not a User/Organization/Project principal.
2. `/admin/*` never receives organization memberships, project memberships, current organization, or current project.
3. User-realm pages never receive `system_role`, `system_permissions`, `isAdmin`, or an Admin-mode switch.
4. There is no “switch to Admin mode” action.
5. A System Admin URL cannot redirect into a Project Workspace as a way to inspect user-domain data.

Inside the **User realm**, one user may enter three kinds of workspace:

- Personal.
- Organization Management, when organization governance capability allows it.
- Project Workspace, separately for every accessible project.

Organization role and project access are related user-domain facts, but one does not imply the other. An organization member only sees projects in which they are a project stakeholder or project member. Organization owner/admin may see the organization portfolio by governance policy.

## 2. Information architecture

### 2.1 Personal

Personal contains account-level capabilities such as profile, marketplace, applications, notifications, settings, organization discovery, and the project directory.

Personal is not a second place to manage tasks or reviews. Personal links enter the selected Project Workspace.

### 2.2 Organization Management

Organization Management contains:

- Organization overview and governance.
- Members and invitations.
- Organization roles and permissions.
- Audit and organization settings.
- Project portfolio.

It does **not** contain copies of project task, sprint, or review boards.

The project portfolio is the bridge: selecting a project leaves Organization Management and enters that project’s Project Workspace.

### 2.3 Project Workspace

Project Workspace contains:

- Overview.
- Members and staffing.
- Professional roles.
- Skills.
- Operating model.
- Sprints.
- Exactly four shared Kanban boards.

The same board is used by every project participant. Role/capability controls which actions are visible or allowed; it does not create another board or another screen.

### 2.4 System Administration

System Administration is an isolated application. Its review-domain operational surface is one System Admin Kanban board for AI dispute progress.

System Administration has no Personal/Organization/Project workspace switcher.

## 3. The five canonical boards

| #   | Realm          | Board                   | Canonical route                            | Shared audience                     |
| --- | -------------- | ----------------------- | ------------------------------------------ | ----------------------------------- |
| 1   | User / Project | Task management         | `/projects/:projectId/tasks`               | Accessible project participants     |
| 2   | User / Project | Task review             | `/projects/:projectId/reviews/tasks`       | Accessible project participants     |
| 3   | User / Project | Assigner review         | `/projects/:projectId/reviews/assigners`   | Privacy-scoped project participants |
| 4   | User / Project | Work-environment review | `/projects/:projectId/reviews/environment` | Privacy-scoped project participants |
| 5   | System         | AI dispute progress     | `/admin/disputes`                          | System Admin only                   |

“Shared audience” means one route and one board component. It does not mean every card or action is public. Backend privacy and action guards still apply.

## 4. Board-first interaction contract

### 4.1 Task Board

The task board is both the task list and the task-management surface.

- Create task: modal on the board using `?create=1`.
- Task detail: card room/drawer on the board using `?task_id=:taskId`.
- Edit/delete/submission/status: actions in the card room where capability permits.
- A separate task list, create page, edit page, or history page is not part of the primary information architecture.

### 4.2 Task Review Board

When a task reaches a done-category status:

1. The task command opens or reuses one `task_review_workflow` in the same transaction.
2. Its initial status is `awaiting_review`.
3. The board query places it in the first lane, “Waiting for review”.

The board owns the full workflow:

`awaiting_review → in_review → awaiting_response → disputed → reported → ai_reviewing → resolved → done`

The selected card opens its review room on the same board with `?task_id=:taskId`.

“Waiting on me” is a board filter, not a separate reviewer inbox.

### 4.3 Assigner and Work-environment Review Boards

Both are opened after sprint closure and use the same lifecycle engine while remaining separate project boards.

- Assigner review route: `/reviews/assigners`.
- Environment review route: `/reviews/environment`.
- A selected workflow opens on the board with `?workflow_id=:workflowId`.
- Completed/history views are filters such as `?status=done`, not standalone history screens.
- Card visibility remains actor-scoped for privacy.

### 4.4 System Admin AI Dispute Board

The System board shows the end-to-end operational lifecycle:

`pending → collecting_evidence → reported → admin_reviewing → ai_reviewing → resolved | rejected | cancelled`

Each card opens `/admin/disputes/:disputeId` as its decision room.

The previous AI operator table and System reverse-review history page are retired. The
operator alias may redirect inside the System realm; the reverse-review page and API are
not registered.

## 5. Workspace access contract

Only User-realm responses expose `workspaceAccess`:

```ts
{
  realm: 'user',
  personal: { canEnter: true },
  organization: {
    id: string,
    role: string,
    canEnterManagement: boolean
  } | null,
  projects: Array<{
    id: string,
    name: string,
    canEnter: true
  }>
}
```

Rules:

- Project switcher entries are derived from accessible projects, not every project in the current organization.
- Organization Management appears only when `canEnterManagement` is true.
- No Admin entry exists in this object.
- Current project is cleared if it is no longer accessible.

System-realm responses expose only System identity and System authorization:

```ts
{
  realm: 'system',
  id: string,
  username: string,
  email: string,
  system_role: string,
  system_permissions: string[]
}
```

## 6. Canonical and retired routes

| Retired URL                                            | Runtime outcome                                       |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `/tasks`                                               | Current project task board, otherwise `/projects`     |
| `/org/tasks/board`                                     | Current project task board                            |
| `/org/tasks/list`                                      | Current project task board                            |
| `/tasks/create`                                        | Project task board with create modal                  |
| `/tasks/:taskId`                                       | Project task board with `task_id` card room           |
| `/tasks/:taskId/edit`                                  | Project task board with `task_id` card room           |
| `/work/tasks/:taskId`                                  | Project task board with `task_id` card room           |
| `/org/tasks/:taskId`                                   | Project task board with `task_id` card room           |
| `/reviews/task-board`                                  | Not registered                                        |
| `/org/reviews/task-board`                              | Not registered                                        |
| `/reviews/pending`                                     | Not registered; use Task Review `focus=waiting_on_me` |
| `/reviews/sprint-reverse-board`                        | Not registered                                        |
| `/org/reviews/sprint-reverse-board`                    | Not registered                                        |
| `/reviews/reverse-reviews`                             | Not registered                                        |
| `/org/reverse-reviews`                                 | Not registered                                        |
| `/org/disputes`                                        | Not registered                                        |
| `/admin/disputes/ai-operator`                          | `/admin/disputes?focus=ai`                            |
| `/admin/reverse-reviews`                               | Not registered                                        |
| `/api/admin/reverse-reviews`                           | Not registered                                        |
| `GET /api/me/reverse-reviews`                          | Not registered                                        |
| `GET /api/v1/me/reverse-reviews`                       | Not registered                                        |
| `GET /api/org/reverse-reviews`                         | Not registered                                        |
| `GET /api/v1/me/organizations/current/reverse-reviews` | Not registered                                        |

Task compatibility routes may temporarily protect task bookmarks. Retired review/history/inbox
page routes are deliberately absent so they cannot become a second UI again.

## 7. Removed duplication

The following are not target screens:

- Task list separate from Task board.
- Task create/edit/detail as full-page primary flows.
- Reviewer pending inbox separate from Task Review board.
- Review-session dossier/rate/confirm pages separate from the selected board card room.
- Reverse-review history page.
- Organization task/review boards.
- Organization dispute queue.
- Admin AI operator table.
- Admin reverse-review history.
- A status-board proof of concept.

Profile may show a personal evidence summary. It must not restore a global reverse-review history route.

## 8. Implementation evidence

Key implementation points:

- `app/modules/http/middleware/inertia_middleware.ts` builds disjoint System and User auth shapes.
- `app/modules/admin/middleware/system_admin_context_middleware.ts` fixes the Admin context to the System realm.
- `inertia/apps/user/shared/components/navigation/project_sections.ts` defines the four Project boards.
- `inertia/apps/user/shared/components/layout/project_sidebar.svelte` renders Project Workspace navigation.
- `app/modules/tasks/controllers/list_tasks_controller.ts` owns the canonical Project task board and legacy redirect.
- `app/modules/reviews/controllers/show_task_review_board_controller.ts` owns the canonical task-review board.
- `app/modules/reviews/controllers/show_sprint_reverse_review_board_controller.ts` owns assigner/environment boards.
- `app/modules/reviews/domain/review_policy.ts` contains no System override for Project review access or submission.
- `app/modules/reviews/infra/adapters/lucid_review_session_actor_access_reader.ts` loads only
  User-realm membership/reviewer facts behind a Reviews-owned port.
- `app/modules/tasks/actions/commands/complete_task_assignments_command.ts` owns the ordered DONE
  workflow and invokes the Reviews capability before staging completion events.
- `app/modules/reviews/infra/repositories/read/task_review_board_queries.ts` projects Done tasks into `awaiting_review`.
- `inertia/apps/admin/modules/disputes/index.svelte` is the System Admin Kanban.
- `inertia/apps/admin/shared/constants/routes.ts` contains only System-realm routes.
- `POST /api/admin/reviews/disputes/:disputeId/comments` keeps Admin discussion inside the System API boundary.
- `ResolveReviewDisputeCommand` commits alternative dispute-source transactions before writing operational checkpoints, avoiding a connection-lock timeout.
- `start/routes/reviews.ts` does not register the retired review/history/inbox pages or Admin reverse-review API.
- `start/routes/users.ts` exposes only compatibility GET redirects; old User administration mutations and System-user APIs are absent.
- `GET /org/members/candidates` returns data-minimized User-realm candidate fields and no `system_role`.

## 9. Acceptance gates

The architecture is accepted only when all of the following hold:

1. User shared props contain no System authorization fields.
2. Admin shared props contain no organization/project workspace fields.
3. No `/admin/toggle` route, Admin-mode command, or Admin entry in the user switcher exists.
4. Project navigation contains exactly four board entries.
5. Organization navigation contains governance and portfolio, not project board copies.
6. A normal organization member sees only accessible projects.
7. Moving a task to Done atomically creates/reuses `awaiting_review`.
8. The same Done task appears on the Project Task Review board.
9. All review states, including AI and terminal states, have visible lanes.
10. Retired review/history/inbox URLs are unregistered and absent from active navigation.
11. Legacy task page URLs enter the Project board and never render create/detail/edit pages.
12. System dispute comments and decisions use Admin-only routes and APIs.

## 10. Verification snapshot — 2026-07-28

- Route inventory: five canonical board GET routes present; zero retired review/history GET surfaces; Admin comment endpoint isolated.
- Backend policy/source unit tests: **33/33 passed**.
- Backend Admin dispute, route-guard, and observability integration tests: **17/17 passed**.
- Targeted frontend component/source/i18n tests: **121/121 passed** across 19 files.
- Playwright discovery: **12 tests** across five canonical-board E2E files.
- Targeted ESLint: passed.
- Full `tsc --noEmit`: passed.
- Board/realm EN and VI translation keys are complete. The global translation-integrity test still reports missing keys on unrelated proficiency, talents, profile, applications, and other concurrent surfaces.
