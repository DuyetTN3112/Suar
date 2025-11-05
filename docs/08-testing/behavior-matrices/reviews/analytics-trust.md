# Review Analytics And Trust Hierarchical Test-Case Matrix

| Field | Value |
|---|---|
| Status | Active hierarchical matrix |
| L0 Domain | Reviews |
| L1 Large Flow | Review analytics |
| Source evidence | `../review-dispute-governance.md` |
| Last Reviewed | 2026-07-14 |

## Atomic Cases

| Domain | Large Flow | Subflow | Scenario ID | Test Case ID | Actor | Preconditions | Resource State | Input Class | Specific Input | Trigger | Expected API | Expected DB/State | Expected UI | Side effects | Backend | Contract | Component | E2E | Evidence | Test Strength | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reviews | Review analytics | Anomaly detection | REV-AN-SC01 suspicious pattern flagged | REV-AN-TC001 | System/process | Suspicious review pattern exists | Review graph | anomaly input | Bulk same level / mutual high reviews | Run detection | Success | Flagged review rows created | Admin flagged list can show | Audit/observability | N/A | N/A | partial | N/A | `detect_anomaly.spec.ts`, flagged page tests | partial | partial |
| Reviews | Review analytics | Anomaly detection | REV-AN-SC02 normal pattern not flagged | REV-AN-TC002 | System/process | Normal review data | Review graph | normal input | Balanced reviews | Run detection | Success | No false flagged row | No flagged row | None | N/A | N/A | N/A | N/A | `detect_anomaly.spec.ts` partial | partial | partial |
| Reviews | Review analytics | Trust recalculation | REV-AN-SC03 trust updates after completed reviews | REV-AN-TC003 | System/process | Completed reviews | User skill/trust stats | valid reviews | Completed review set | Recalculate trust | Success | Trust data updated | Profile/review chart can render | Stats event if required | N/A | N/A | partial | N/A | `trust_score.spec.ts`, profile tests partial | partial | partial |
| Reviews | Review analytics | Performance score | REV-AN-SC04 performance stats update | REV-AN-TC004 | System/process | Completed reviews/tasks | Performance stats | valid data | User/project data | Recalculate performance | Success | Performance rows updated | Chart/card renders | None | N/A | N/A | partial | N/A | `performance_score.spec.ts` | partial | partial |
| Reviews | Review analytics | Spider chart | REV-AN-SC05 spider chart dimensions | REV-AN-TC005 | Viewer | Review skill dimensions exist | Chart data | valid data | User id | Load chart data | Dimension data returned | No write | Spider chart renders expected dimensions | None | N/A | N/A | partial | N/A | `spider_chart.spec.ts` | partial | partial |
| Reviews | Review analytics | Empty analytics | REV-AN-SC06 no review history | REV-AN-TC006 | Viewer | No reviews | Empty stats | empty result | User id | Load analytics | Default/empty response | No write | No-data state, no NaN | None | covered | N/A | covered | missing | `app/modules/reviews/tests/backend/integration/spider_chart.spec.ts`, `inertia/apps/user/tests/modules/profile/components/profile_spider_chart_card.test.ts` covers insufficient-data label, no reviewed-data copy, no highest-verified panel, and no `NaN`/`Infinity`/`undefined` leakage. | partial | partial |
