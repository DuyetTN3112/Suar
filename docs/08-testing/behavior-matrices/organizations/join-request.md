# Organization Join Request Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Organizations |
| L1 Large Flow | Join request |
| Source evidence | `../organization-membership-invitation.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Organizations | Join request | Submit request | ORG-JR-SC01 valid join request | ORG-JR-TC001 | Authenticated non-member | Public/joinable org exists | No membership | valid request | Org id + message if any | Request to join | Success | Pending membership/request row | Request pending state visible | Notification to admins if required | covered | N/A | N/A | covered | `join_request.spec.ts`, `inertia/apps/org/tests/e2e/org/join_request_journey.spec.ts` | covered | covered |
| Organizations | Join request | Submit request | ORG-JR-SC02 duplicate pending request | ORG-JR-TC002 | Requester | Pending request exists | Pending membership | duplicate | Same org id | Request to join again | Conflict/idempotent per rule | One pending row | Stable pending state | No duplicate notification unless defined | covered | N/A | N/A | N/A | `join_request.spec.ts` partial | partial | partial |
| Organizations | Join request | Submit request | ORG-JR-SC03 already member | ORG-JR-TC003 | Approved member | Approved membership exists | Approved membership | duplicate approved | Same org id | Request to join | Reject/no-op per rule | Membership unchanged | Already-member state | None | covered | N/A | partial | N/A | `join_request.spec.ts` | partial | partial |
| Organizations | Join request | Approve request | ORG-JR-SC04 owner approves | ORG-JR-TC004 | Owner/admin | Pending join request | Pending membership | valid transition | Request id | Approve | Success | Membership approved | Request disappears from pending queue; member appears in org | Notification/audit if required | covered | N/A | N/A | covered | `join_request.spec.ts`, `inertia/apps/org/tests/e2e/org/join_request_journey.spec.ts` | covered | covered |
| Organizations | Join request | Reject request | ORG-JR-SC05 owner rejects | ORG-JR-TC005 | Owner/admin | Pending join request | Pending membership | valid transition | Request id | Reject | Success | Request marked rejected per rule | Request disappears from pending queue | Notification/audit if required | covered | N/A | N/A | covered | `join_request.spec.ts`, `inertia/apps/org/tests/e2e/org/join_request_journey.spec.ts` | covered | covered |
| Organizations | Join request | Permission boundary | ORG-JR-SC06 pending admin cannot approve | ORG-JR-TC006 | Pending admin/member | Pending membership | Pending actor membership | forbidden actor | Request id | Approve/reject | Forbidden before org-admin session or command execution | Request unchanged | Pending actor cannot bootstrap target org-admin session; owner still sees pending request | None | covered | N/A | N/A | covered | `join_request.spec.ts`, `inertia/apps/org/tests/e2e/org/join_request_journey.spec.ts` | covered | covered |
| Organizations | Join request | Permission boundary | ORG-JR-SC07 outsider cannot approve | ORG-JR-TC007 | Outsider/non-owner org admin | Pending request in foreign org | Pending membership | unauthorized actor | Request id | Approve/reject | Forbidden/not found, never 500 | Request unchanged | No request leak; owner still sees pending request | None | covered | N/A | N/A | covered | `join_request.spec.ts`, `inertia/apps/org/tests/e2e/org/join_request_journey.spec.ts` | covered | covered |
