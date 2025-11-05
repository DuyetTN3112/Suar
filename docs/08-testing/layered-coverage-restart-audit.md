# Layered Coverage Restart Audit

Last reviewed: 2026-07-14

## Rule

Unit, integration, component, and E2E coverage are independent evidence layers.

Do not mark an E2E-required row as complete from integration evidence alone. Use statuses like:

- `covered integration; E2E missing`
- `Backend=covered; Component=covered; E2E=missing`
- `Backend=covered; Component=covered; E2E=covered`

## Current Scan

- Matrix files scanned: 57
- Matrix rows scanned: 554
- Rows still weak/missing/partial/requirement/debt: 320
- Rows requesting E2E with weak/missing/partial E2E proof: 134

## E2E Gap Counts

| Area | E2E weak/missing rows |
|---|---:|
| Marketplace | 23 |
| Organizations | 23 |
| Tasks | 13 |
| Admin | 15 |
| Auth | 15 |
| Projects | 11 |
| Users | 10 |
| Marketplace application flow summary | 6 |
| Reviews | 6 |
| Notifications | 3 |
| Auth login/session summary | 2 |
| Search | 1 |
| Skills | 1 |

## Restart Progress

- Replaced weak marketplace apply/withdraw smoke E2E with seeded exact E2E.
- Added marketplace guest apply E2E: unauthenticated browser/API attempt rejected and no application row created.
- Added marketplace own-applications E2E: signed-in applicant sees own seeded application and not another applicant's seeded task.
- Added marketplace reviewer E2E: task owner sees exact seeded applicant row, source, and pending status.
- Added marketplace reject E2E: task owner rejects a seeded application from browser, process route returns 204, reviewer row changes to `Từ chối`, and applicant sees exact rejection reason in `/my-applications?status=rejected`.
- Added marketplace approve E2E: task owner approves one seeded application, process route returns 204, reviewer row changes to `Đã duyệt`, approved applicant sees `Được chọn`, and second pending applicant is auto-rejected with `Another applicant was selected`.
- Added marketplace negative reviewer-access E2E: same-org plain member redirects away from seeded task application page with no applicant row.
- Added marketplace foreign-recruiter no-leak Playwright session request: foreign org owner hitting seeded task application URL redirects to `/org` and response body omits seeded applicant/task data; full browser render still has `/org/dashboard` missing-page caveat.
- Added marketplace negative process-action E2E/API: same-org plain member reject attempt and foreign recruiter approve attempt both return 403, and owner still sees both seeded applications pending.
- Added marketplace storage invariant integration: apply/process/withdraw routes create/update `task_applications` and leave matching `marketplace_applications` rows absent.
- Added marketplace apply/process route-contract integration: empty apply payload and unsafe portfolio URL return validation errors with no rows, duplicate and owner apply return business-rule errors with one row at most, and invalid process action leaves the pending application unchanged.
- Added marketplace project-manager E2E: seeded project manager with no org workspace opens exact applications page, rejects the pending application, and the applicant sees the exact rejection reason.
- Added marketplace stale-apply E2E and UI fix: browser opens the apply modal, another request creates the pending application, the stale modal submit receives real duplicate denial, and the modal renders the exact backend message instead of generic network text.
- Fixed test-runtime Vite manifest selection: `NODE_ENV=test` now reads the fresh `build/public/assets/.vite/manifest.json`, and the safe integration script builds Vite assets before running integration tests.
- Re-ran marketplace integration evidence separately from E2E: `task_applications`, `task_application_access`, `my_applications_flow`, and `marketplace_routes.spec.ts` now pass together.
- Hardened both E2E login helpers to throw status/body-specific token and session bootstrap errors instead of generic truthy assertions.
- Removed marketplace apply/withdraw from false-pass allowlist and refreshed critical E2E policy entries to existing specs.
- Added backend/integration guard for cross-project sprint assignment.
- Added organization invitation E2E: owner sends invite through UI, invitee sees inbox, accepts through UI, then enters accepted org context/task workspace.
- Added organization invitation reject E2E: seed pending invite, invitee opens inbox, rejects through browser UI, backend returns success, and seeded org row disappears from the inbox.
- Added organization join-request submit E2E: seeded non-member opens available organizations, requests to join a target org, receives route success, and sees the card move to `Đang chờ duyệt`.
- Added organization join-request approve E2E: seeded pending requester appears in org requests queue, owner approves through browser UI, route succeeds, and the request disappears from the pending queue.
- Added organization join-request reject E2E: seeded pending requester appears in org requests queue, owner rejects through browser UI, route succeeds, and the request disappears from the pending queue.
- Added organization join-request permission-boundary E2E and integration regression: non-owner with a valid CSRF/session cannot process a foreign pending request, the API returns a controlled not-found/forbidden response instead of 500, and the owner still sees the pending request.
- Added organization join-request pending-admin boundary coverage: command-layer integration rejects a pending `org_admin` actor with `ForbiddenException`, browser-level token/session proof rejects target org-admin bootstrap for the pending actor, and the owner still sees the pending request.
- Added organization invitation foreign-response E2E: authenticated foreign user hits real `PUT /api/v1/me/invitations/:organizationId/{accept,reject}` routes, both return controlled not-found/forbidden-style denial, and the invited user still sees the pending invitation.
- Added organization invitation stale-response coverage: integration rejects accepting an already rejected invitation with `NotFoundException`, and browser E2E loads a pending invite, makes it stale through the real reject route, then verifies stale accept returns controlled denial with no 500.
- Fixed invitee pending-invitations pagination query so Lucid preloads `organization`/`inviter` without losing the `organization_id` foreign key; covered by `org_invitations_query.spec.ts`.
- Added auth landing unit and SocialLoginCommand integration matrix for member/admin/system-admin/no-org/stale-org redirects.
- Fixed stale `current_organization_id` landing: users without an approved membership role now land on `/organizations`, not `/tasks`.
- Added auth token/session negative integration coverage: invalid refresh, refresh replay rejection, missing bootstrap token, invalid bootstrap bearer.
- Added login page E2E proving `/login` renders OAuth-only Google/GitHub entry links and no email/password form.
- Added logout E2E proving `/logout` clears the browser session and protected `/tasks` redirects back to login.
- Added task create request-boundary unit coverage for missing/blank/overlong title and invalid enum payloads.
- Added task create integration coverage for unknown project id and unknown assignee id, with no task row persisted.
- Added task create integration coverage for past due date rejection, with no task row persisted.
- Added task create unit/integration coverage for overlong description rejection, with no task row persisted; E2E remains missing for browser long-description path.
- Added task create integration coverage for invalid enum rejection, with no task row persisted; E2E remains missing for browser invalid-enum path.
- Added task detail integration coverage for foreign internal detail denial; E2E remains missing for browser denied-state path.
- Added task comments integration coverage for outsider comment denial, with no comment row persisted; E2E remains missing for browser discussion denial.
- Added task submission integration coverage for duplicate submit rejection, stable review-session count, and no duplicate reviewer notifications; E2E remains missing for browser disabled/stable state.
- Added task submission integration coverage for invalid evidence URL rejection, with no submission/evidence rows persisted; component/E2E field state remains missing.
- Added task status integration coverage for todo -> done skip rejection and cancelled -> in_progress direct reopen rejection, with unchanged task state and no success audit; E2E error states remain missing.
- Added task attachment integration coverage for invalid size/type rejection, with no attachment rows persisted; component/E2E file-picker state remains missing.
- Reclassified task create deadline-before-start row as current-contract mismatch: task create has `due_date` but no task-level `start_date`; project start/end relation belongs to project coverage.
- Fixed update-task parent hierarchy guard: updating a task parent to one of its descendants now rejects before mutation/audit/version snapshot.
- Added update-task optimistic concurrency guard: stale `expected_updated_at` now returns conflict before overwriting newer state.
- Hardened task create E2E form coverage: selected project context renders, required field controls are enabled, empty title and missing required-skills show real browser-visible errors.
- Added task create valid-submit E2E: seeded owner/project/statuses/skills, browser fills required contract fields, submits real UI, and verifies created task detail renders.
- Added task create whitespace-title E2E so blank spaces/newlines are rejected in the browser, not only at request-mapper unit layer.
- Added task create past-due E2E: browser selects a deadline in the past, submits real UI, sees the due-date field error, and stays on create page.
- Added task create foreign-project E2E: org A user submits browser form with org B project id, sees form-level project boundary error, and stays on create page.
- Added project skill duplicate integration coverage: second add rejects and only one `project_skills` row remains; component/E2E stable-list state remains missing.
- Added organization task-scope E2E: with `current_project_id` set to project A, `/org/tasks/list?scope=organization` still renders exact task titles from project A and project B, proving the org-wide escape does not accidentally hide other project tasks.
- Added sprint board E2E coverage for project managers: browser moves a backlog task into the active sprint, and a separate browser/API route attempt proves a sprint from another project is rejected while the task remains in backlog.
- Reconciled existing auth landing, auth refresh replay, and global search evidence rows from current specs; no fresh E2E pass claimed in this restart checkpoint.
- Current targeted marketplace E2E verification is green, but some other browser rows remain blocked by shared route/Inertia runtime errors unless a specific Playwright spec can be run green again.
- Current targeted marketplace integration verification is green for application domain specs plus marketplace route/page assertions.
- Added DB safety control unit coverage: safe integration script exits before migration/build when `test database config` is missing, unsafe `database config` names are rejected, and unsafe bypass now requires/logs `ALLOW_UNSAFE_TEST_DATASTORES_REASON`. This is control evidence only; it does not prove any product E2E row.

## Next Priority

1. Remaining project/task E2E rows with status-transition browser error states and other rows still marked weak/partial.
2. Auth/session E2E and helper false-pass rows.
3. Broader DB drift gate: generated schema and `schema/migration evidence` stay synced with migrations.
4. Marketplace withdraw stale-state UI error display.
