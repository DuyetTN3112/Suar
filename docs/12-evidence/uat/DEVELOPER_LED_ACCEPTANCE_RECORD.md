# Developer-led Acceptance Testing Record

**Status:** Accepted for academic demonstration by the project author  
**Protocol:** `DEVELOPER_LED_ACCEPTANCE_PROTOCOL.md`  
**Project:** Suar  
**Tester / acceptance authority:** Project author acting as project owner  
**Participant count:** `n = 1`  
**Independence:** None; developer and tester are the same person  

Codex operated the repeatable browser and integration checks. The project
author remains the only participant and acceptance authority. This record does
not claim that the author personally performed every browser action.

## 1. Candidate

| Field | Recorded value |
|---|---|
| Git commit | `cbf08b6cf352281d7e32f29da6d9af297859ca11` |
| Branch | `main` |
| Working-tree state/fingerprint | Dirty development tree. Source-candidate SHA-256: `3228ee4e7e1437f2bef30edc97c9a1c7999ae98e8ece86a325fb9f3cc731cd27`; status-list SHA-256: `2fd6ca8b66857d192aff1f37d4c098a0f8236acb57fb34a1894118a7ce9c3927`; tracked-diff SHA-256: `db043a387d5510e608d82fc30706c6687a90698da222816fb9a23d1ffa9fb70a`. The source fingerprint covers tracked diffs and untracked content under executable source, configuration, migration, test and script paths; evidence/report-only edits are excluded. |
| Candidate label | `Suar-UAT-2026-07-31-3228ee4e` |
| Test date and timezone | 31 July 2026, 11:29--11:30, UTC+07:00 |
| Application URL | `http://127.0.0.1:3333` |
| Browser/version | Chromium `148.0.7778.96`; Playwright `1.60.0` |
| Operating environment | Ubuntu/Linux `7.0.0-28-generic`, x86_64; local isolated E2E environment |
| Browser-action operator | Codex-assisted Playwright automation |
| Project-author review | Completed; Tran Ngoc Duyet confirmed acceptance for academic demonstration on 31 July 2026 |
| PostgreSQL test database identifier | `suar_test` |
| Redis test endpoint identifier | data: `127.0.0.1:6379`, DB 14; cache: `127.0.0.1:6381`, DB 0 |
| Elasticsearch test index prefix | `suar_test_` at `http://127.0.0.1:9201` |
| Preparation command(s) | `bash scripts/start_e2e_server.sh` (isolated datastore guard and test server) |
| Execution command(s) | The 14-spec Playwright command in Section 2.1; AI callback/fencing integration command in Section 2.2 |

The working tree contains ongoing development, including user-prepared seed
work. It is therefore not represented as a clean release commit. The
source-candidate fingerprint was recorded before the final browser run; no
source or seed file was changed during that run.

## 2. Entry checks

| Check | Result | Evidence/note |
|---|---|---|
| Seed files stable and compiling | PASS | Seed routes compiled and returned HTTP 201 throughout the run. |
| Candidate recorded before execution | PASS | Candidate `Suar-UAT-2026-07-31-3228ee4e` was fingerprinted before the final 64-test run. |
| Test datastore guard passed | PASS | `scripts/start_e2e_server.sh` started the isolated data plane. |
| Required services healthy | PASS | Application, PostgreSQL, Redis and Elasticsearch test services supported the complete run. |
| Selected Playwright tests discovered | PASS | Playwright discovered 64 tests across the 14 named specifications. |
| Main/development database excluded | PASS | Execution used PostgreSQL database `suar_test`; the curated main seed/database was not mutated by acceptance. |

### 2.1 Browser acceptance command and run result

```bash
E2E_REUSE_EXISTING_SERVER=true pnpm exec playwright test --workers=1 --reporter=line \
  inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts \
  inertia/apps/org/tests/e2e/meta/cross_surface_smoke.spec.ts \
  inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts \
  inertia/apps/org/tests/e2e/projects/project_member_management.spec.ts \
  inertia/apps/org/tests/e2e/projects/staffing_flow.spec.ts \
  inertia/apps/user/tests/e2e/auth/login_page.spec.ts \
  inertia/apps/user/tests/e2e/auth/logout.spec.ts \
  inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts \
  inertia/apps/user/tests/e2e/profile/profile_trust_explanation.spec.ts \
  inertia/apps/user/tests/e2e/projects/project_workspace_access.spec.ts \
  inertia/apps/user/tests/e2e/reviews/task_review_board_demo.spec.ts \
  inertia/apps/user/tests/e2e/tasks/match_score_explainability.spec.ts \
  inertia/apps/user/tests/e2e/tasks/task_application_triage.spec.ts \
  inertia/apps/user/tests/e2e/tasks/task_submission_package.spec.ts
```

Observed result: `64 passed (1.5m)`. The run started after candidate
identification and completed at 11:30:21 UTC+07:00. Playwright's run marker
recorded `status: passed` and no failed test IDs.

### 2.2 AI-advice boundary support

```bash
node ace test --files \
  app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts \
  app/modules/reviews/tests/backend/integration/ai_dispute_trigger_fencing.spec.ts \
  --timeout=10000
```

Observed result: `21 passed`. The checks covered authenticated and malformed
callbacks, idempotency, stale/late attempt fencing, concurrent reconciliation
and the separation between advisory output and the human-controlled resolution.

## 3. Scenario results

| ID | Role(s) | Result | Actual result | Evidence | Issue/retest |
|---|---|---|---|---|---|
| AT-01 | Guest, contributor | PASS (automated evidence) | OAuth entry choices rendered; logout cleared the local session; protected routes did not expose user data to a guest. External OAuth-provider completion was not claimed. | Login/logout specs in the 64-test run. | None |
| AT-02 | Contributor | PASS (automated evidence) | Personal, organisation and permitted project surfaces loaded; a regular member stayed outside the manager-only project workspace. | Project-workspace and cross-surface specs in the 64-test run. | None |
| AT-03 | Contributor, project manager | PASS (automated evidence) | Eligible work could be applied to and withdrawn; owner/manager decisions persisted; duplicate, foreign-role and unauthorised API actions were denied. | Marketplace and task-triage specs in the 64-test run. | None |
| AT-04 | Organisation owner / project manager | PASS (automated evidence) | Candidate/member selection, addition, role controls and project member visibility behaved as expected. | Project-member and staffing specs in the 64-test run. | None |
| AT-05 | Contributor | PASS (automated evidence, after retest) | The assignee saved, uploaded and submitted from project and `/work` surfaces; the submitted/locked state reloaded; an outsider was denied. | Six submission-package E2E tests; six component tests; final 64-test run. | `ACC-01`, resolved |
| AT-06 | Contributor, reviewer | PASS (automated evidence) | Owner and manager reviews were attributable; the worker observed response state and accepted the completed review. | `task_review_board_demo.spec.ts`; `test-results/e2e-visual/task-review-board/00-owner-reviewed.png` through `03-worker-done.png`. | None |
| AT-07 | Contributor, reviewer, system administrator | PASS (automated evidence) | A worker dispute reached the administrator queue with task/review context and AI-advice state; ordinary-role admin access remained denied. | Task-review-board and admin-console specs; task-review screenshots. | None |
| AT-08 | Contributor | PASS (automated evidence) | Trust tier, skill inventory/provenance, review credibility and work history rendered without inventing missing evidence. | Four profile-trust tests in the 64-test run. | None |
| AT-09 | Organisation owner / project manager | PASS (automated evidence) | Talent pages handled populated, empty and malformed-query states; match cards exposed available evidence signals and did not fabricate reasons for incomplete candidates. | Talent and match-explainability specs in the 64-test run. | None |
| AT-10 | System administrator, contributor | PASS (automated evidence) | System audit context was visible to the superadmin; guest, regular user and organisation owner were denied system-admin surfaces. | Nine admin-console tests plus cross-surface checks. | None |
| AT-11 | System administrator | PASS (automated evidence) | Invalid/stale callbacks were rejected, retries were fenced/idempotent, and AI advice did not become the authoritative dispute decision. | 21 callback/fencing integration tests plus the browser dispute-to-admin scenario. | None |

## 4. Issues and retests

| Issue ID | Scenario | Severity | Observation and reproduction | Candidate affected | Resolution | Retest result/evidence |
|---|---|---|---|---|---|---|
| `ACC-01` | AT-05 | Major | After submission, the evidence reload used `/api/task-submissions/:id/evidences` without the versioned `/v1` segment, which returned 404. The saved submission existed, but the panel could remain editable and fail to expose the correct submitted/lock state. | Pre-final working snapshot, before `Suar-UAT-2026-07-31-3228ee4e` | The panel now uses the canonical `/api/v1/task-submissions/:id/evidences` endpoint and preserves the distinct `/work` API base. | PASS: 6/6 submission-panel component tests and all 6 submission-package E2E tests passed; the complete 64-test run also passed. |

## 5. Result summary

| Measure | Value |
|---|---:|
| Total scenarios | 11 |
| Passed | 11 |
| Failed | 0 |
| Blocked | 0 |
| Not run | 0 |
| Passed after retest | 1 |
| Open Critical issues | 0 |
| Open Major issues | 0 |
| Open Minor issues | 0 |

## 6. Project-owner decision

**Decision:** Accept for academic demonstration.

**Residual limitations:** Acceptance is developer-led, single-participant and
executed on a dirty but fingerprinted development candidate. It cannot
establish independent testing, representative-user validation, usability
quality, production readiness, coefficient fairness or AI recommendation
accuracy.

**Decision rationale:** The final browser run produced 64/64 passes, the
AI-advice boundary support produced 21/21 passes, and no Critical, Major or
Minor acceptance issue remains open. The project author accepts the candidate
for academic demonstration subject to the limitations above.

**Project-author confirmation:** “I, Tran Ngoc Duyet, confirm that I have
reviewed the recorded developer-led acceptance results and accept this
candidate for academic demonstration, subject to the stated limitations.”

**Recorded by:** Tran Ngoc Duyet (project author and acceptance authority);
browser evidence operated by Codex-assisted automation  
**Recorded at:** 31 July 2026, 11:30:21 UTC+07:00
