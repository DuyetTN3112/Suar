# User Invitation Inbox Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Users/Profile |
| L1 Large Flow | Invitation inbox |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Users/Profile | Invitation inbox | List invitations | USR-IV-SC01 pending invitations visible | USR-IV-TC001 | Invitee | Pending invitations exist | Pending memberships | valid list | Own user | Open invitations page | Own pending invites returned | No write | Invitation rows visible | None | N/A | N/A | covered | partial | `inertia/apps/user/tests/modules/profile/invitations.test.ts` | partial | partial |
| Users/Profile | Invitation inbox | Empty inbox | USR-IV-SC02 no invitations | USR-IV-TC002 | User | No pending invitations | Empty set | empty result | Own user | Open invitations page | Empty collection | No write | Empty state visible | None | N/A | N/A | covered | missing | `inertia/apps/user/tests/modules/profile/invitations.test.ts` | partial | partial |
| Users/Profile | Invitation inbox | Accept from inbox | USR-IV-SC03 accept own invitation | USR-IV-TC003 | Invitee | Pending invite | Pending membership | valid transition | Own invite id | Click accept | Success | Membership approved | Invite removed/org access available | Notification/audit if required | covered | N/A | N/A | covered | `app/modules/organizations/tests/backend/integration/membership.spec.ts`, `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts` | covered | covered |
| Users/Profile | Invitation inbox | Reject from inbox | USR-IV-SC04 reject own invitation | USR-IV-TC004 | Invitee | Pending invite | Pending membership | valid transition | Own invite id | Click reject | Success | Invite rejected/removed | Invite removed | Notification/audit if required | covered | N/A | N/A | covered | `membership.spec.ts`, `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts` | covered | covered |
