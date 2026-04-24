# Organization Invitation Send Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Organizations |
| L1 Large Flow | Invitation |
| Source evidence | `../organization-membership-invitation.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Organizations | Invitation | Send invitation | ORG-IS-SC01 owner invites new user | ORG-IS-TC001 | Owner/admin | Approved org | Target not member | valid email | New target email | Send invitation | Success | Pending membership/invite state | Pending invite visible | Invite notification/email | covered | N/A | partial | covered | `org_invitations_query.spec.ts`, `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts` | partial | partial |
| Organizations | Invitation | Send invitation | ORG-IS-SC02 plain member denied | ORG-IS-TC002 | Plain member | Approved membership | Org active | forbidden actor | Target email | Send invitation | Forbidden | No pending row | Invite control hidden/error | None | covered | N/A | N/A | partial | `membership.spec.ts` | partial | partial |
| Organizations | Invitation | Send invitation | ORG-IS-SC03 pending admin denied | ORG-IS-TC003 | Pending admin | Pending membership | Org active | forbidden actor state | Target email | Send invitation | Forbidden | No pending row | No invite capability | None | partial | N/A | N/A | partial | `app/modules/organizations/tests/backend/integration/org_invitations_query.spec.ts` covers pending admin denial and no invitation audit trail; no exact UI/E2E proof for pending-admin invite capability hidden. | partial | partial |
| Organizations | Invitation | Email validation | ORG-IS-SC04 invalid email | ORG-IS-TC004 | Owner/admin | Approved org | Target not member | malformed email | `not-an-email` | Send invitation | Validation error | No pending row | Field error | None | covered | N/A | partial | N/A | `organization_dto_contracts.spec.ts` | partial | partial |
| Organizations | Invitation | Duplicate target | ORG-IS-SC05 already member | ORG-IS-TC005 | Owner/admin | Target approved member | Approved membership | duplicate approved | Existing member email | Send invitation | Conflict/domain error | Membership unchanged | Error shown | None | covered | N/A | partial | N/A | `membership.spec.ts` | partial | partial |
| Organizations | Invitation | Duplicate target | ORG-IS-SC06 pending duplicate | ORG-IS-TC006 | Owner/admin | Target already pending | Pending membership | duplicate pending | Pending email | Send invitation | Conflict/idempotent per rule | One pending row | Stable pending state | No duplicate notification unless defined | covered | N/A | partial | N/A | `membership.spec.ts` | partial | partial |
| Organizations | Invitation | Target state | ORG-IS-SC07 inactive user target | ORG-IS-TC007 | Owner/admin | Target inactive/deleted | Inactive user | invalid target state | Inactive email | Send invitation | Reject | No pending/approved access | Error shown | None | covered | N/A | N/A | N/A | `membership.spec.ts` | covered | covered |
