# Marketplace Application Withdraw Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Marketplace |
| L1 Large Flow | Application withdraw |
| Source evidence | `../marketplace-application-flow.md` |
| Last Reviewed | 2026-07-14 |

## Tree

```text
MKT-L04 Application withdraw
├── MKT-S11 Own pending application
├── MKT-S12 Invalid ownership
├── MKT-S13 Invalid application state
└── MKT-S14 UI result
```

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Marketplace | Application withdraw | Own pending application | MKT-WD-SC01 valid withdraw | MKT-WD-TC001 | Applicant | Own application exists | Pending application | valid transition | Own pending application id | Withdraw application | Success | Application withdrawn/deleted per rule | My applications row leaves pending or shows withdrawn | Notification/audit if required | covered | N/A | N/A | covered | `task_applications.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` | covered | covered |
| Marketplace | Application withdraw | Invalid ownership | MKT-WD-SC02 foreign application | MKT-WD-TC002 | Other applicant | Application belongs to another user | Pending application | unauthorized resource | Foreign application id | Withdraw application | Forbidden/not found | Application unchanged | No foreign row visible/actionable | None | covered | N/A | N/A | partial | `task_applications.spec.ts` | partial | partial |
| Marketplace | Application withdraw | Invalid application state | MKT-WD-SC03 approved application | MKT-WD-TC003 | Applicant | Own application approved | Approved application | invalid state | Approved application id | Withdraw application | Reject per rule | Application unchanged | Withdraw action hidden/error | None | covered | N/A | partial | N/A | `task_applications.spec.ts` | partial | partial |
| Marketplace | Application withdraw | Invalid application state | MKT-WD-SC04 rejected application | MKT-WD-TC004 | Applicant | Own application rejected | Rejected application | invalid state | Rejected application id | Withdraw application | Reject or no-op per rule | Application unchanged | Withdraw action hidden/error | None | covered | N/A | partial | N/A | `task_applications.spec.ts` | partial | partial |
| Marketplace | Application withdraw | Invalid application state | MKT-WD-SC05 task assigned after apply | MKT-WD-TC005 | Applicant | Own application pending, task assigned | Task no longer open | stale task state | Pending app on assigned task | Withdraw application | Success or reject per product rule | State deterministic | Exact UI result | Notification/audit per rule | covered | N/A | N/A | partial | `task_applications.spec.ts` | partial | partial |
| Marketplace | Application withdraw | UI result | MKT-WD-SC06 backend rejects withdraw | MKT-WD-TC006 | Applicant | UI shows action but server rejects | Stale application state | backend rejection | Server returns error | Click withdraw | Error response | Application unchanged | Exact error shown, no false success | None | N/A | N/A | covered | missing | `inertia/apps/user/tests/modules/applications/my_applications.test.ts` covers rejected withdraw response, error notification, no success reload, and unchanged pending row; no Playwright stale-reject flow yet | partial | partial |
