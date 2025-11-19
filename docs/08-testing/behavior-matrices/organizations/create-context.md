# Organization Create And Context Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Organizations |
| L1 Large Flows | Create organization, current organization/project context |
| Source evidence | `../organization-membership-invitation.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Organizations | Create organization | Valid create | ORG-CC-SC01 active creator | ORG-CC-TC001 | Active user | No restriction preventing creation | New org | valid payload | Name/settings | Create org | Success | Org, owner membership, default workflow, audit, notification | New org selectable/current | Welcome notification/audit | covered | N/A | N/A | partial | `create_org.spec.ts` | partial | partial |
| Organizations | Create organization | Creator state | ORG-CC-SC02 inactive creator | ORG-CC-TC002 | Inactive user | Inactive account | New org | forbidden actor | Valid payload | Create org | Reject | No org side effects | Error shown | None | covered | N/A | partial | N/A | `create_org.spec.ts` | partial | partial |
| Organizations | Create organization | Duplicate naming | ORG-CC-SC03 duplicate names | ORG-CC-TC003 | Active creators | Existing org name | New org | duplicate name | Same org name | Create org | Success with unique slug or reject per rule | Deterministic slug/name state | Distinct orgs or clear error | Audit only if created | covered | N/A | N/A | N/A | `create_org.spec.ts` | partial | partial |
| Organizations | Current context | Approved membership | ORG-CC-SC04 approved current org | ORG-CC-TC004 | Approved member | Membership approved | Active org | valid context | Current org id | Resolve/switch org | Context valid | Session/current org set | Org shell loads | None | covered | N/A | N/A | partial | `org_resolver.spec.ts`, `switch_context_api_standardization.spec.ts` | partial | partial |
| Organizations | Current context | Pending membership | ORG-CC-SC05 pending current org denied | ORG-CC-TC005 | Pending member | Membership pending | Pending membership | forbidden state | Current org id | Resolve org | Context denied | Session org not approved | Require-org/error guarded state | None | covered | N/A | N/A | partial | `org_resolver.spec.ts`, `join_request.spec.ts` | partial | partial |
| Organizations | Current context | Deleted/invalid org | ORG-CC-SC06 invalid current org clears | ORG-CC-TC006 | User | Session points at invalid org | Deleted/missing org | stale resource | Invalid org id | Resolve org | Clears/fallbacks per rule | Session current org corrected | No blank shell loop | None | covered | N/A | N/A | partial | `org_resolver.spec.ts`; clear/fallback behavior still partial | partial | partial |
| Organizations | Current context | Switch org | ORG-CC-SC07 switch to approved org | ORG-CC-TC007 | Approved member of two orgs | Two approved orgs | Active orgs | valid transition | Target org id | Switch org | Wrapped success | Session/current org changed | Shell switches org | None | covered | N/A | N/A | partial | `switch_context_api_standardization.spec.ts` | partial | partial |
| Organizations | Current context | Switch foreign org | ORG-CC-SC08 switch to foreign denied | ORG-CC-TC008 | User | Target org without approved membership | Foreign org | unauthorized resource | Foreign org id | Switch org | Forbidden/not found | Session unchanged | No foreign shell | None | covered | N/A | N/A | partial | `switch_context_api_standardization.spec.ts` | partial | partial |
