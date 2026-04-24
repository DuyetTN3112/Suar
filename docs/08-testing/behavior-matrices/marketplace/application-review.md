# Marketplace Application Review Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Marketplace |
| L1 Large Flow | Application review |
| Source evidence | `../marketplace-application-flow.md` |
| Last Reviewed | 2026-07-14 |

## Tree

```text
MKT-L06 Application review
├── MKT-S15 Reviewer list
├── MKT-S16 Approve application
├── MKT-S17 Reject application
├── MKT-S18 Permission boundary
└── MKT-S19 Ranking/recommendation support
```

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Marketplace | Application review | Reviewer list | MKT-RV-SC01 authorized reviewer sees pending apps | MKT-RV-TC001 | Task owner/project manager | Task has pending apps | Pending applications | valid list | Own task id | Open applications list | List contains exact seeded applicants | No write | Exact applicant rows visible, no empty-state fallback | None | covered | N/A | N/A | covered | `task_application_access.spec.ts`, `marketplace_routes.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` | covered | covered |
| Marketplace | Application review | Reviewer list | MKT-RV-SC02 outsider cannot list apps | MKT-RV-TC002 | Outsider | Task has pending apps | Pending applications | unauthorized actor | Same-org plain member and foreign-org recruiter | Open applications list | Forbidden/redirect | No data leak | Same-org browser redirects away with no applicant row; foreign-org session request redirects to `/org` without applicant/task data | None | covered | N/A | N/A | covered | `task_application_access.spec.ts`, `marketplace_routes.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` | covered | covered |
| Marketplace | Application review | Approve application | MKT-RV-SC03 valid approve | MKT-RV-TC003 | Authorized reviewer | Pending application | Task unassigned | valid transition | Pending application id | Approve | Success | Application approved; task assigned per rule; other pending applicant rejected | Reviewer row changes to `Đã duyệt`; approved applicant sees `Được chọn`; other applicant sees `Không được chọn` with `Another applicant was selected` | Notification/audit if required | covered | N/A | N/A | covered | `task_applications.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` | covered | covered |
| Marketplace | Application review | Approve application | MKT-RV-SC04 duplicate approve | MKT-RV-TC004 | Authorized reviewer | Application already approved | Approved application | duplicate state | Same application id | Approve again | Reject/idempotent per rule | No duplicate assignment | Stable approved state | No duplicate notification unless defined | covered | N/A | N/A | N/A | `task_applications.spec.ts` | covered | covered |
| Marketplace | Application review | Approve application | MKT-RV-SC05 approve after task assigned | MKT-RV-TC005 | Authorized reviewer | Another applicant already assigned | Task assigned | stale state | Different pending app | Approve | Reject | No second assignee | Error shown | None | covered | N/A | N/A | partial | `task_applications.spec.ts` | partial | partial |
| Marketplace | Application review | Reject application | MKT-RV-SC06 valid reject | MKT-RV-TC006 | Authorized reviewer | Pending application | Pending application | valid transition | Pending application id + reason | Reject | Success | Application rejected; reason stored; reviewer recorded | Owner and project-manager reviewer rows change to `Từ chối`; applicant rejected filter shows exact reason | Notification/audit if required | covered | N/A | N/A | covered | `task_applications.spec.ts`, `marketplace_routes.spec.ts`, `my_applications_page.test.ts`, `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` | covered | covered |
| Marketplace | Application review | Reject application | MKT-RV-SC07 reject approved app | MKT-RV-TC007 | Authorized reviewer | Application approved | Approved application | invalid state | Approved application id | Reject | Reject per rule | Approved state unchanged | Error/hidden action | None | covered | N/A | N/A | N/A | `task_applications.spec.ts` | covered | covered |
| Marketplace | Application review | Permission boundary | MKT-RV-SC08 plain member cannot process | MKT-RV-TC008 | Plain member / foreign recruiter | Task in same or foreign org | Pending applications | forbidden actor | Pending app id | Approve/reject | Forbidden | Application unchanged | Process API returns 403; owner later still sees rows pending | None | covered | N/A | partial | covered | `task_applications.spec.ts`, `marketplace_routes.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` | partial | partial |
| Marketplace | Application review | Ranking support | MKT-RV-SC09 ranked list deterministic | MKT-RV-TC009 | Authorized reviewer | Multiple applicants with scores | Pending applications | ordering | Tied/varied scores | Open ranking list | Deterministic ranking order | No write | Ranking warning/score display clear | None | covered | N/A | partial | N/A | `task_worker_management.spec.ts`, `application_match_score.spec.ts` | partial | partial |
