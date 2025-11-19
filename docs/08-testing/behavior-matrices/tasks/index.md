# Tasks Hierarchical Test-Case Matrices

| Field | Value |
|---|---|
| Status | Active split index |
| Parent evidence matrix | `../task-lifecycle-status-submission.md` |
| Standard | `../../hierarchical-test-case-decomposition.md` |
| Last Reviewed | 2026-07-14 |

## Flow Tree

```text
Task Domain
├── Create task
├── Update/assign task
├── List/access task
├── Status lifecycle
├── Board interaction
├── Submission
├── Comments
├── Attachments
└── Public marketplace access
```

## Split Matrices

| Matrix | Purpose |
|---|---|
| `create-update.md` | Atomic create/update/input/permission rows |
| `list-access.md` | Atomic task list/detail/access rows |
| `board-interaction.md` | Atomic board dialog/pagination/conflict rows |
| `status-transition.md` | Atomic state-transition decision table replacing grouped `TASK-022` |
| `submission.md` | Atomic save/submit/lock/evidence rows |
| `comments-attachments.md` | Atomic comment/reply/evidence/attachment rows |
