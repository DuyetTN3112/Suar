# Organization Membership Role Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Organizations |
| L1 Large Flow | Member role/remove |
| Source evidence | `../organization-membership-invitation.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Organizations | Member role/remove | List members | ORG-MR-SC01 admin lists members | ORG-MR-TC001 | Owner/admin | Approved org | Mixed members | valid list | Search/page params | Open members | Own org members only | No write | Exact member rows visible | None | partial | N/A | partial | N/A | `app/modules/organizations/tests/backend/unit/list_organization_members_query.spec.ts`, `inertia/apps/org/tests/modules/members/index.test.ts`; backend integration for exact mixed-member listing remains partial. | partial | partial |
| Organizations | Member role/remove | Update role | ORG-MR-SC02 owner promotes member | ORG-MR-TC002 | Owner | Approved target member | Active member | valid transition | Member -> admin | Update role | Success | Role changed | Role badge/control updates | Audit/notification if required | partial | N/A | N/A | partial | `app/modules/organizations/tests/backend/integration/membership.spec.ts` covers owner promotion and side effects; no exact component or Playwright proof for role badge update. | partial | partial |
| Organizations | Member role/remove | Update role | ORG-MR-SC03 pending member role change denied | ORG-MR-TC003 | Owner/admin | Target pending | Pending member | invalid target state | Pending member -> admin | Update role | Reject | Role/status unchanged | Error shown | None | partial | N/A | partial | N/A | `app/modules/organizations/tests/backend/integration/membership.spec.ts` covers pending-admin denial; component evidence only partial for member page error/control state. | partial | partial |
| Organizations | Member role/remove | Update role | ORG-MR-SC04 non-owner changes owner denied | ORG-MR-TC004 | Admin/member | Owner exists | Owner member | forbidden actor/action | Owner role update | Update role | Forbidden | Owner role unchanged | Control hidden/error | None | covered | N/A | N/A | partial | `membership.spec.ts` | partial | partial |
| Organizations | Member role/remove | Remove member | ORG-MR-SC05 owner removes member | ORG-MR-TC005 | Owner/admin per rule | Target approved member | Active member | valid removal | Member id | Remove member | Success | Membership removed; task unassignment rule applied | Member removed from list | Audit/notification; unassign tasks | partial | N/A | N/A | partial | `app/modules/organizations/tests/backend/integration/membership.spec.ts` covers owner removal, task unassignment, member count, and audit data; no exact E2E proof for member removed from list. | partial | partial |
| Organizations | Member role/remove | Remove member | ORG-MR-SC06 remove owner denied | ORG-MR-TC006 | Admin/member | Target owner | Owner member | forbidden target | Owner id | Remove member | Reject | Owner membership unchanged | Error/control hidden | None | covered | N/A | N/A | partial | `membership.spec.ts` | partial | partial |
| Organizations | Member role/remove | Cross-org boundary | ORG-MR-SC07 foreign member mutation denied | ORG-MR-TC007 | Owner/admin in org A | Target in org B | Foreign member | foreign resource | Foreign member id | Update/remove | Forbidden/not found | Foreign membership unchanged | No foreign data/action | None | covered | N/A | N/A | partial | `membership.spec.ts` | partial | partial |
