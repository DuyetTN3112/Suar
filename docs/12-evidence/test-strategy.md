# Test Strategy — Realm isolation and the five boards

**Updated:** 2026-07-28

## 1. What must never regress

1. System Admin and User are separate principals/realms.
2. No System authorization enters User/Org/Project shared props.
3. No organization or project workspace data enters Admin shared props.
4. Organization Management has no duplicated Project boards.
5. Project Workspace has exactly four board routes.
6. Done atomically opens `awaiting_review`.
7. Review history/inbox/detail behavior stays inside boards through filters and card rooms.
8. The fifth board is System Admin only.

## 2. Test layers

| Layer | Purpose |
|---|---|
| Unit | Shared-prop shaping, redirect mapping, navigation construction, state mapping |
| Integration | Project visibility, membership guards, Done transaction, board queries |
| Contract | Disjoint Admin/User response shapes and stable canonical URLs |
| Component | Workspace switchers, Project sidebar, five Kanban surfaces, overlays |
| E2E | Real navigation across Personal → Org → Project without entering Admin |
| Security | Cross-realm denial and unauthorized project access |
| A11y | Board headings, lanes, card links, dialogs, keyboard flow |

## 3. Required decision tables

### 3.1 Realm shared props

| Request | Principal | Must include | Must exclude |
|---|---|---|---|
| `/admin/*` | System Admin | `realm=system`, System role/permissions | organization, projects, workspaceAccess |
| User route | User | `realm=user`, workspaceAccess | System role/permissions, Admin switch |
| `/admin/*` | User | denial | Admin page data |
| User route | System Admin principal | separate User authentication required | implicit crossover |

### 3.2 Workspace entries

| User-domain state | Personal | Org Management | Project entries |
|---|---:|---:|---|
| No organization | yes | no | accessible standalone entries only |
| Ordinary org member, no project | yes | no | none |
| Ordinary org member, project member | yes | per governance capability | only that project |
| Org owner/admin | yes | yes | portfolio policy |

### 3.3 Task Done gate

| Valid submission/bypass | Can change status | Expected |
|---|---|---|
| yes | yes | task Done + one `awaiting_review` workflow in same transaction |
| no | yes | move rejected; no workflow |
| any | no | move rejected; no workflow |
| repeated Done event | yes | reuse workflow; no duplicate |

## 4. Board state coverage

Component and integration tests must enumerate every lane:

- Task Review: `awaiting_review`, `in_review`, `awaiting_response`, `disputed`, `reported`, `ai_reviewing`, `resolved`, `done`.
- Assigner/Environment: the same lifecycle supported by their domain model.
- System dispute: `pending`, `collecting_evidence`, `reported`, `admin_reviewing`, `ai_reviewing`, `resolved`, `rejected`, `cancelled`.

Every status must have:

- a visible lane;
- a stable count;
- a card placement case;
- an empty-lane case;
- a deep-link/card-room case.

## 5. Retired-route tests

For retired review/history/inbox UI routes:

- assert that no route is registered;
- assert that retired reverse-review history GET APIs are not registered;
- assert the retired URL is absent from active navigation, dashboards, and notification deep links;
- assert canonical board routes preserve `task_id`, `workflow_id`, sprint, and filters;
- keep redirect assertions only for explicitly retained task-bookmark or System operator aliases.

An alias is never evidence that the old screen still exists.

## 6. E2E critical journeys

1. User opens Personal, selects a project, reaches Project Task board.
2. User with Org Management capability enters `/org`, opens portfolio, selects project, leaves Org shell for Project Workspace.
3. Ordinary org member cannot see unauthorized projects.
4. Task is submitted, moved to Done, and appears in the first Task Review lane.
5. Reviewer acts from the shared Task Review card room.
6. Sprint closure opens assigner and environment reviews on their two boards.
7. Completed environment review is visible with `status=done`, without a history page.
8. System Admin signs into the separate System realm and uses `/admin/disputes`.
9. User-domain session cannot access board 5.
10. System realm contains no link to Personal, Org, or Project.
11. System Admin comments through `/api/admin/reviews/disputes/:disputeId/comments`, never a User dispute endpoint.
12. Resolving sprint/task workflow sources commits before operational logging and completes without a transaction-lock timeout.

## 7. Quality gate

The change is releasable when:

- targeted unit/integration/component tests are green;
- the two cross-realm negative tests are green;
- canonical route inventory is green;
- no active navigation contains retired URLs;
- targeted TypeScript/Svelte checks are green;
- unrelated baseline failures are documented separately.

Current targeted snapshot: backend unit 33/33, Admin dispute/route/observability integration
17/17, frontend 121/121, route inventory green, and 12 Playwright tests discovered across five
canonical-board E2E files. Full TypeScript passes and all board/realm EN/VI keys resolve.
The global translation-integrity baseline remains red on unrelated concurrent surfaces.
