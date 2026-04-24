# Marketplace Hierarchical Test-Case Matrices

| Field | Value |
|---|---|
| Status | Active split index |
| Parent evidence matrix | `../marketplace-application-flow.md` |
| Standard | `../../hierarchical-test-case-decomposition.md` |
| Last Reviewed | 2026-07-14 |

## Flow Tree

```text
Marketplace Application Lifecycle
├── Task discovery
├── Application submit
├── My applications
├── Application withdraw
├── Reviewer application list
├── Application approval
├── Application rejection
└── Recommendation/ranking
```

## Split Matrices

| Matrix | Purpose |
|---|---|
| `task-discovery.md` | Atomic task listing/filter/empty-state rows |
| `application-submit.md` | Atomic submit/validation/input-boundary cases |
| `application-withdraw.md` | Atomic withdraw ownership/state rows |
| `application-review.md` | Atomic reviewer list/approve/reject rows |

Recommendation/ranking gets first-pass support rows in `application-review.md`; separate recommendation matrix can be extracted if product rules grow.
