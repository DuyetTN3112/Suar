# Developer-led Acceptance Testing Protocol

**Status:** Ready for execution; no acceptance result is claimed by this file.  
**Project:** Suar  
**Test model:** Project-owner acceptance testing with one participant  
**Participant count:** `n = 1`  
**Acceptance authority:** The project author acting as project owner  
**Independence:** None; the tester is also the developer  

## 1. Purpose and evidence boundary

This protocol determines whether one fixed Suar candidate supports the principal
work-to-evidence journeys defined for the individual academic project.

The project author executes the scenarios while acting in the intended
contributor, reviewer, organisation owner/project manager and system
administrator roles. Multiple role accounts do not increase the participant
count: the record remains `n = 1`.

The resulting evidence may be described as:

- developer-led acceptance testing;
- project-owner acceptance testing; or
- single-tester role-based acceptance testing.

It must not be described as independent testing, representative-user
validation, a usability study, market validation or production adoption.

Existing Playwright and integration tests may prepare data, repeat browser
actions and capture artefacts. Automated pass results support the observation
record, but do not by themselves constitute the project-owner acceptance
decision.

Codex-assisted automation may operate the browser and collect repeatable
technical evidence. If it does, the record must identify the automation
operator and the project author must review the actual results before signing
the decision. It must not state that the author personally performed every
browser action unless that occurred.

## 2. Candidate and environment controls

Before execution, record all of the following in
`DEVELOPER_LED_ACCEPTANCE_RECORD.md`:

1. Git commit and branch.
2. A working-tree fingerprint. Prefer a clean tree; if the tree is not clean,
   preserve a diff/status artefact and state that limitation.
3. Test date and local timezone.
4. Browser name and version.
5. Application URL and execution environment.
6. PostgreSQL test database identifier, Redis test endpoint and Elasticsearch
   test index prefix without recording credentials.
7. Human and automated execution operators.
8. Commands used to prepare and run the candidate.

Acceptance execution must use the isolated test data plane enforced by
`scripts/start_e2e_server.sh`. It must not run `seed:data --fresh` against the
development/main database. The curated main seed may be used later for report
screenshots, but it is not the mutable datastore used for acceptance execution.

No source or seed changes should be made between candidate identification and
the final scenario. If a defect is corrected, record a new candidate and run
the affected scenario as a retest.

## 3. Roles

| Test role | Responsibility exercised during acceptance |
|---|---|
| Guest | Inspect sign-in entry points and protected-route denial. |
| Contributor | Discover work, apply, submit evidence, inspect reviews and raise a dispute. |
| Reviewer | Inspect a completion package and submit an attributable review. |
| Organisation owner / project manager | Staff a project, manage the task journey and decide on applications. |
| System administrator | Inspect governed audit/dispute information and perform the final human action. |

The same tester performs every role. Each role change must be explicit in the
scenario record.

## 4. Entry criteria

Execution may start when:

- the seed files required by the E2E server compile and are not being edited;
- all required test datastore variables are configured;
- the datastore safety guard passes;
- the candidate identifier is recorded;
- the selected Playwright specifications are discoverable;
- no critical environment service is unavailable.

Failure to meet an entry criterion is recorded as an environment blocker, not
as a product acceptance failure.

## 5. Acceptance scenarios

| ID | Role(s) | User goal and actions | Observable acceptance criterion | Existing automation support |
|---|---|---|---|---|
| AT-01 | Guest, contributor | Open the login page, inspect the supported social-login choices, then verify that an unauthenticated user cannot enter a protected workspace. | Google/GitHub entry choices are presented; a protected route does not expose user data to the guest. Testing-auth may establish the local session, but it is not evidence that the external OAuth provider completed successfully. | `inertia/apps/user/tests/e2e/auth/login_page.spec.ts`; `inertia/apps/user/tests/e2e/auth/logout.spec.ts` |
| AT-02 | Contributor | Enter Personal workspace, open an accessible project and inspect navigation across Personal, Organisation and Project surfaces. | Only permitted workspaces/projects are visible; project navigation reaches the canonical project surface; no System Admin entry is exposed. | `inertia/apps/user/tests/e2e/projects/project_workspace_access.spec.ts`; `inertia/apps/org/tests/e2e/meta/cross_surface_smoke.spec.ts` |
| AT-03 | Contributor, project manager | Discover an eligible external task, submit an application, inspect My Applications, then approve or reject it as the responsible organisation role. | Eligible work is discoverable; hidden/internal or already-assigned work is not leaked; the application state is visible; an approved application creates the intended assignment once. | `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts`; `inertia/apps/user/tests/e2e/tasks/task_application_triage.spec.ts` |
| AT-04 | Organisation owner / project manager | Add or select a project member and assign the intended project responsibility. | Membership and role changes are visible and the member receives only the expected project access. | `inertia/apps/org/tests/e2e/projects/staffing_flow.spec.ts`; `inertia/apps/org/tests/e2e/projects/project_member_management.spec.ts` |
| AT-05 | Contributor | Open an assigned task, inspect its acceptance criteria, submit a completion package and attach evidence. | The package retains the task context and submitted evidence; unauthorised users cannot submit; the submitted state is visible after navigation/reload. | `inertia/apps/user/tests/e2e/tasks/task_submission_package.spec.ts` |
| AT-06 | Contributor, reviewer | Submit attributable owner and manager reviews, inspect the worker response state, and accept the completed review as the worker. | The first authorised reviewer can start the workflow; reviewer results and roles are stored; the reviewee can see and accept the resulting state. | `inertia/apps/user/tests/e2e/reviews/task_review_board_demo.spec.ts` |
| AT-07 | Contributor, reviewer, system administrator | Raise a dispute as the worker and inspect its governed escalation to the administrator queue and AI-advice surface. | The dispute retains attributable task and review context; escalation changes the governed state; AI output is advisory and the ordinary user cannot perform the administrator's final action. | `inertia/apps/user/tests/e2e/reviews/task_review_board_demo.spec.ts`; `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts` |
| AT-08 | Contributor | Inspect the capability profile, skill groups, reviewed/imported distinction, review evidence and work history. | The interface distinguishes reviewed evidence from imported/self-declared claims and exposes the provenance needed to interpret the profile. | `inertia/apps/user/tests/e2e/profile/profile_trust_explanation.spec.ts` |
| AT-09 | Organisation owner / project manager | Inspect talent candidates and the explanation attached to a match/staffing result. | Candidate information and contributing signals are visible; the interface presents the result as an explanation/heuristic rather than a guaranteed judgement. | `inertia/apps/user/tests/e2e/tasks/match_score_explainability.spec.ts`; `inertia/apps/org/tests/e2e/org/org_talent_pages.spec.ts` |
| AT-10 | System administrator, contributor | Inspect the system audit/dispute surface as an administrator and attempt the same access from the user realm. | The administrator can trace governed context; the user realm is denied; System and User/Organisation data remain separated. | `inertia/apps/admin/tests/e2e/admin/admin_audit_logs_console.spec.ts`; `inertia/apps/org/tests/e2e/meta/cross_surface_smoke.spec.ts` |
| AT-11 | System administrator | Trigger or inspect AI dispute advice, verify the validated advisory output and then make the human resolution separately. | AI output cannot directly resolve the dispute or publish profile evidence; invalid/stale callbacks are rejected; a human-controlled action is required for the authoritative decision. | `app/modules/reviews/tests/backend/integration/ai_dispute_callback.spec.ts`; `app/modules/reviews/tests/backend/integration/ai_dispute_trigger_fencing.spec.ts`; manual browser observation required |

## 6. Result recording

For every scenario, record:

- candidate identifier;
- start/end time;
- role and test account label;
- preconditions and test data;
- concise action sequence;
- expected result;
- actual result;
- `PASS`, `FAIL` or `BLOCKED`;
- screenshot, trace, log or database-safe record identifier;
- issue ID and severity when applicable;
- retest candidate and result.

Do not use a screenshot as the sole evidence for a state-changing workflow.
Combine it with the observed response/state or a traceable record identifier.

## 7. Issue severity

| Severity | Meaning | Acceptance effect |
|---|---|---|
| Critical | Data loss, privilege bypass, unauthorised disclosure, or the principal journey cannot be completed. | Reject until corrected and retested. |
| Major | A core scenario fails or its state/result is materially misleading, but no Critical condition occurs. | Reject or conditionally accept only with an explicit bounded rationale and scheduled retest. |
| Minor | The goal is achievable with a small presentation, wording or low-risk interaction defect. | May be accepted with a recorded residual issue. |
| Observation | Improvement idea or non-blocking ambiguity. | Does not change the scenario result. |

## 8. Exit and decision rules

The project-owner decision is made only after all AT-01--AT-11 scenarios have
an outcome.

- **Accept for academic demonstration:** every scenario passes; no open
  Critical or Major issue remains.
- **Conditional accept for academic demonstration:** no Critical issue remains;
  any open Major/Minor issue is listed with its effect and rationale.
- **Reject candidate:** a Critical issue remains, a principal journey cannot be
  completed, or required scenarios are unexecuted for a product reason.
- **No decision / blocked:** the environment or unfinished candidate prevents a
  meaningful run.

The decision does not establish production readiness, independent usability,
accessibility conformance, representative-user satisfaction, coefficient
fairness or AI model quality.
