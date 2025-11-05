# Marketplace Task Discovery Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Marketplace |
| L1 Large Flow | Task discovery |
| Source evidence | `../marketplace-application-flow.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Marketplace | Task discovery | Visible task listing | MKT-TD-SC01 external visible task | MKT-TD-TC001 | Authenticated marketplace user | External/all visible task exists | Unassigned open task | valid filter | No filters | Open marketplace tasks | Returns exact visible task | No write | Exact task title visible | None | covered | N/A | N/A | covered | `marketplace_routes.spec.ts`, `tasks_public_api_task_reader.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` | covered | covered |
| Marketplace | Task discovery | Hidden task listing | MKT-TD-SC02 internal task hidden | MKT-TD-TC002 | Marketplace user | Internal task exists | Internal task | visibility boundary | No filters | Open marketplace tasks | Internal task excluded | No write | Internal title absent | None | covered | N/A | N/A | covered | `marketplace_routes.spec.ts`, `tasks_public_api_task_reader.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` | covered | covered |
| Marketplace | Task discovery | Assigned task hidden | MKT-TD-SC03 assigned task hidden | MKT-TD-TC003 | Marketplace user | Assigned task exists | Assigned task | state boundary | No filters | Open marketplace tasks | Assigned task excluded | No write | Assigned title absent | None | covered | N/A | N/A | covered | `marketplace_routes.spec.ts`, `inertia/apps/user/tests/e2e/marketplace/apply_withdraw_my_applications.spec.ts` | covered | covered |
| Marketplace | Task discovery | Search/filter | MKT-TD-SC04 query filters tasks | MKT-TD-TC004 | Marketplace user | Multiple visible tasks | Open tasks | valid search | Search text | Apply filter | Matching rows only | No write | Exact match visible, non-match absent | Search telemetry if defined | covered | N/A | partial | partial | `marketplace_routes.spec.ts`, `public_task_search_engine.spec.ts`, `get_public_tasks_query.spec.ts` | partial | partial |
| Marketplace | Task discovery | Empty state | MKT-TD-SC05 true empty state | MKT-TD-TC005 | Marketplace user | No visible tasks | Empty set | empty result | No filters or unmatched filter | Open list | Empty collection | No write | Empty state visible only when seeded empty | None | covered | N/A | N/A | partial | `marketplace_routes.spec.ts` | partial | partial |
