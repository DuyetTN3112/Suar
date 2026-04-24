# Organization Ownership Transfer Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Organizations |
| L1 Large Flow | Ownership transfer |
| Source evidence | `../organization-membership-invitation.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Organizations | Ownership transfer | Valid transfer | ORG-OT-SC01 owner transfers to approved member | ORG-OT-TC001 | Current owner | Target approved member | Active org | valid transition | Target member id | Transfer ownership | Success | Target becomes owner; old owner downgraded per rule | Ownership badge/control updates | Audit/notification | covered | N/A | N/A | partial | `transfer_organization_ownership.spec.ts` | partial | partial |
| Organizations | Ownership transfer | Actor boundary | ORG-OT-SC02 non-owner denied | ORG-OT-TC002 | Admin/member | Target approved member | Active org | forbidden actor | Transfer target | Transfer ownership | Forbidden | Roles unchanged | Transfer control unavailable/error | None | covered | N/A | N/A | partial | `transfer_organization_ownership.spec.ts` | partial | partial |
| Organizations | Ownership transfer | Target state | ORG-OT-SC03 pending target denied | ORG-OT-TC003 | Owner | Target pending | Pending member | invalid target state | Pending target | Transfer ownership | Reject | Roles unchanged | Error shown | None | covered | N/A | partial | N/A | `transfer_organization_ownership.spec.ts` | partial | partial |
| Organizations | Ownership transfer | Target state | ORG-OT-SC04 inactive target denied | ORG-OT-TC004 | Owner | Target inactive/deleted | Inactive member | invalid target state | Inactive target | Transfer ownership | Reject | Roles unchanged | Error shown | None | covered | N/A | N/A | N/A | `transfer_organization_ownership.spec.ts` | covered | covered |
| Organizations | Ownership transfer | Cross-org boundary | ORG-OT-SC05 foreign target denied | ORG-OT-TC005 | Owner | Target in other org | Foreign member | foreign resource | Foreign member id | Transfer ownership | Forbidden/not found | Both orgs unchanged | No foreign target visible | None | covered | N/A | N/A | partial | `transfer_organization_ownership.spec.ts` | partial | partial |
