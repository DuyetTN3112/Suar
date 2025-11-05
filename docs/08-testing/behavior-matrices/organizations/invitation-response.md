# Organization Invitation Response Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Organizations |
| L1 Large Flow | Invitation |
| Source evidence | `../organization-membership-invitation.md` |
| Last Reviewed | 2026-07-14 |

## Tree

```text
ORG-L03 Invitation
├── ORG-S08 Send invitation
├── ORG-S09 Invitee inbox
├── ORG-S10 Accept invitation
└── ORG-S11 Reject invitation
```

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Organizations | Invitation | Send invitation | ORG-IV-SC01 valid invite | ORG-IV-TC001 | Owner/admin | Approved org, target not member | No membership | valid email | Target email | Invite member | Invitation/pending membership created | `organization_users.status = pending` | Invite appears pending | Notification/email if required | covered | N/A | partial | N/A | `org_invitations_query.spec.ts` | partial | partial |
| Organizations | Invitation | Send invitation | ORG-IV-SC02 invalid email | ORG-IV-TC002 | Owner/admin | Approved org | No membership | malformed email | `not-an-email` | Invite member | Validation error | No membership row | Field error | None | covered | N/A | partial | N/A | `organization_dto_contracts.spec.ts` | partial | partial |
| Organizations | Invitation | Send invitation | ORG-IV-SC03 invite self | ORG-IV-TC003 | Owner/admin | Approved org | Actor already member | forbidden target | Actor email | Invite member | Domain error | No duplicate membership | Error shown | None | covered | N/A | partial | N/A | `membership.spec.ts` | partial | partial |
| Organizations | Invitation | Send invitation | ORG-IV-SC04 already member | ORG-IV-TC004 | Owner/admin | Target approved member | Existing approved membership | duplicate | Member email | Invite member | Conflict/domain error | Membership unchanged | Error shown | None | covered | N/A | partial | N/A | `membership.spec.ts` | partial | partial |
| Organizations | Invitation | Send invitation | ORG-IV-SC05 pending duplicate | ORG-IV-TC005 | Owner/admin | Target pending | Existing pending membership | duplicate pending | Pending email | Invite member | Conflict/idempotent per rule | One pending row | Pending state stable | No duplicate notification unless defined | covered | N/A | partial | N/A | `membership.spec.ts` | partial | partial |
| Organizations | Invitation | Send invitation | ORG-IV-SC06 inactive user | ORG-IV-TC006 | Owner/admin | Target inactive/deleted | Inactive account | inactive target | Inactive user email | Invite member | Reject per rule | No approved access | Error shown | None | covered | N/A | N/A | N/A | `membership.spec.ts` | covered | covered |
| Organizations | Invitation | Invitee inbox | ORG-IV-SC07 pending invitation visible | ORG-IV-TC007 | Invitee | Pending invitation | Pending membership | valid state | Own pending org | Open invitations page | List includes pending invite | No write | Org invitation visible | None | covered | N/A | covered | covered | `app/modules/organizations/tests/backend/integration/org_invitations_query.spec.ts`, `inertia/apps/user/tests/modules/profile/invitations.test.ts`, `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts` | covered | covered |
| Organizations | Invitation | Accept invitation | ORG-IV-SC08 valid accept | ORG-IV-TC008 | Invitee | Pending invitation | Pending membership | valid transition | Accept own invite | Accept invitation | Success response | Membership status becomes approved | Org context/task workspace accessible | Notification/audit if required | covered | N/A | N/A | covered | `membership.spec.ts`, `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts` | covered | covered |
| Organizations | Invitation | Accept invitation | ORG-IV-SC09 foreign invite | ORG-IV-TC009 | Other user | Pending invite for someone else | Pending membership | unauthorized resource | Foreign invitation | Accept invitation | Forbidden/not found | Membership unchanged | No org access leak; invitee still sees pending invite | None | covered | N/A | N/A | covered | `membership.spec.ts`, `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts` | covered | covered |
| Organizations | Invitation | Accept invitation | ORG-IV-SC10 expired/cancelled invite | ORG-IV-TC010 | Invitee | Invitation no longer pending | Expired/cancelled | invalid state | Stale invitation | Accept invitation | Controlled not-found/validation denial | Membership unchanged | Stale row remains visible with no 500/server error | None | covered | N/A | N/A | covered | `membership.spec.ts`, `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts` | covered | covered |
| Organizations | Invitation | Reject invitation | ORG-IV-SC11 valid reject | ORG-IV-TC011 | Invitee | Pending invitation | Pending membership | valid transition | Reject own invite | Reject invitation | Success response | Pending row removed or marked rejected per rule | Invite disappears/rejected state | Notification/audit if required | covered | N/A | N/A | covered | `membership.spec.ts`, `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts` | covered | covered |
| Organizations | Invitation | Reject invitation | ORG-IV-SC12 foreign reject | ORG-IV-TC012 | Other user | Pending invite for someone else | Pending membership | unauthorized resource | Foreign invitation | Reject invitation | Forbidden/not found | Membership unchanged | No row leak; invitee still sees pending invite | None | covered | N/A | N/A | covered | `membership.spec.ts`, `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts` | covered | covered |
| Organizations | Invitation | End-to-end journey | ORG-IV-SC13 seeded invite journey | ORG-IV-TC013 | Owner + invitee | Owner can invite; invitee can log in | Pending then approved | canonical journey | Owner invite -> invitee accept -> org access | UI invite and accept | All APIs succeed | Pending -> approved | Invitee enters accepted org context and task workspace | Audit/notification verified if required | N/A | N/A | N/A | covered | `inertia/apps/org/tests/e2e/org/invitation_journey.spec.ts` | covered | covered |

## Notes

- Technical alias rows such as legacy/v1 path compatibility belong in `../../technical-contract-matrices/api-contracts.md`.
- This file targets the critique's direct gap: invite accept/reject and seeded owner-to-invitee E2E.
