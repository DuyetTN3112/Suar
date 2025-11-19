# User Trust Explanation Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Users/Profile |
| L1 Large Flow | Trust explanation |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Users/Profile | Trust explanation | Calculated trust | USR-TR-SC01 user with review history | USR-TR-TC001 | User/viewer | Reviews exist | Trust stats available | valid data | User id | Open trust explanation | Trust stats returned | No write | Score and explanation visible | None | missing | N/A | covered | partial | `inertia/apps/user/tests/modules/profile/components/profile_overview_section.test.ts`, `inertia/apps/user/tests/e2e/profile/profile_trust_explanation.spec.ts` | partial | partial |
| Users/Profile | Trust explanation | No trust data | USR-TR-SC02 new user | USR-TR-TC002 | User/viewer | No reviews | Empty stats | empty result | User id | Open trust explanation | Empty/default trust response | No write | Explicit no-data state | None | N/A | N/A | covered | missing | `inertia/apps/user/tests/modules/profile/components/profile_overview_section.test.ts` | partial | partial |
| Users/Profile | Trust explanation | Raw id privacy | USR-TR-SC03 no raw UUID leak | USR-TR-TC003 | Viewer | Trust data exists | Profile visible | privacy boundary | User/review ids | Render page | IDs may be in API but not unsafe UI | No write | Human labels, no raw UUID where prohibited | None | N/A | N/A | covered | missing | `inertia/apps/user/tests/modules/profile/components/profile_overview_section.test.ts` | partial | partial |
| Users/Profile | Trust explanation | False-pass guard | USR-TR-SC04 content assertion exact | USR-TR-TC004 | E2E runner | Profile page data | Trust/profile sections available | seeded or existing profile | Concrete profile labels/counters | Run E2E | Profile page loads | No write | Specific tab labels, counters, and empty/card states asserted; no broad `hasContent` | None | N/A | N/A | N/A | partial | `inertia/apps/user/tests/e2e/profile/profile_trust_explanation.spec.ts`, `scripts/tests/scan_false_pass_patterns.mjs` | partial | partial |
