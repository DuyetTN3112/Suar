# Test Matrix — Realm isolation and board-first workspaces

**Updated:** 2026-07-28  
**Machine-readable source:** `test-matrix.json`

## 1. Realm isolation

| ID | Layer | Given / When | Expected |
|---|---|---|---|
| REALM-01 | Contract | System Admin requests `/admin/disputes`; shared props are built | `realm=system`; System role/permissions exist; workspace/org/project data is absent |
| REALM-02 | Contract | User-realm page builds shared props | `realm=user`; `workspaceAccess` exists; all System authorization fields are absent |
| REALM-03 | Security | User principal requests `/admin/disputes` | Denied before Admin page data is returned |
| REALM-04 | Route | Route inventory is inspected | `/admin/toggle` does not exist |
| REALM-05 | Component | User workspace switcher renders | Personal, permitted Org Management, and accessible projects only; never Admin |
| REALM-06 | Component | Admin sidebar renders | No Personal/Org/Project workspace switcher |

## 2. User workspace access

| ID | Layer | Given / When | Expected |
|---|---|---|---|
| ACCESS-01 | Integration | Ordinary org member belongs to 1 of 3 org projects; project options load | Only the stakeholder/member project is returned |
| ACCESS-02 | Integration | Org owner/admin loads portfolio | Governance portfolio policy is applied |
| ACCESS-03 | Unit | Current project is no longer accessible; shared props build | Stale current project is cleared |
| ACCESS-04 | Component | `canEnterManagement=false`; switcher renders | Organization Management is absent |
| ACCESS-05 | Component | Portfolio project is selected | Navigate to `/projects/:projectId`, not an Org project-detail copy |

## 3. Navigation

| ID | Layer | Given / When | Expected |
|---|---|---|---|
| NAV-01 | Unit | Project navigation items are counted | Exactly four canonical board entries |
| NAV-02 | Unit | Organization navigation is enumerated | No Org task/review board routes |
| NAV-03 | Integration | User switches A → B while in Environment Review | Same section opens for project B |

## 4. Project Task Board and Done handoff

| ID | Layer | Given / When | Expected |
|---|---|---|---|
| TASK-01 | Component | Canonical task route renders | Kanban only; no list-mode surface |
| TASK-02 | Component | `?create=1` with permission | Create modal opens on board |
| TASK-03 | Component | `?task_id=:taskId` for in-scope task | Card room opens on board |
| TASK-04 | Integration | Valid completion + allowed actor; task reaches Done | Status and one `awaiting_review` workflow commit atomically |
| TASK-05 | Integration | Done processing is retried | Existing workflow reused; no duplicate |
| TASK-06 | Integration | Project contains newly Done task; review query runs | Task appears in first `awaiting_review` lane |
| TASK-07 | Route | Legacy task create/detail/edit or Organization task-detail URL is requested | Redirect into matching Project Task board modal/card room; no full-page task UI renders |

## 5. Project Review Boards

| ID | Layer | Given / When | Expected |
|---|---|---|---|
| REVIEW-01 | Component | Cards cover every task-review state | All eight lanes render and cards are placed correctly |
| REVIEW-02 | Component | `?focus=waiting_on_me` | Same board filters; no pending inbox screen |
| REVIEW-03 | Component | `?task_id=:taskId` | Matching card room opens; no arbitrary default selection |
| REVERSE-01 | Component | Assigner and Environment routes render | Correct review type on shared board component |
| REVERSE-02 | Security | Two users open the same route | Each sees only actor-scoped cards |
| REVERSE-03 | Route | Old reverse-history/inbox/Org review URL is inspected | No UI route is registered |
| REVERSE-04 | Route | Old reverse-review history GET APIs are inspected | No legacy, v1 User, or Organization history GET route is registered |

## 6. System Admin Board

| ID | Layer | Given / When | Expected |
|---|---|---|---|
| ADMIN-01 | Component | Disputes cover every System status | All eight lanes render and cards are placed correctly |
| ADMIN-02 | Component | A dispute card is activated | Open `/admin/disputes/:disputeId` |
| ADMIN-03 | Route | `/admin/disputes/ai-operator` requested | Redirect to `/admin/disputes?focus=ai` |
| ADMIN-04 | Route | `/admin/reverse-reviews` and `/api/admin/reverse-reviews` are inspected | Neither route is registered |
| ADMIN-05 | Security | System Admin posts a dispute comment | Request uses `/api/admin/reviews/disputes/:disputeId/comments`; Admin UI never calls the User dispute API |
| ADMIN-06 | Integration | System Admin resolves sprint/task workflow sources | Transaction commits before checkpoint logging and the request completes without lock timeout |

## 7. Release checklist

- [x] All 34 cases are implemented or mapped to an existing regression test.
- [x] Done-to-review unit and integration tests are green.
- [x] Project sidebar and Organization navigation tests are green.
- [x] System Admin board component tests are green.
- [x] Both cross-realm negative paths are green.
- [x] No active source link contains a retired UI URL.
- [x] Changed board/realm files pass targeted lint, component, and backend checks.
- [x] Full `tsc --noEmit` is green and board/realm EN/VI translation keys resolve.
- [ ] Global translation-integrity baseline is green; unrelated concurrent surfaces still have missing keys.
- [ ] GitNexus change detection reports only the expected architecture surface.
