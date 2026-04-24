# Organization Hierarchical Test-Case Matrices

| Field | Value |
|---|---|
| Status | Active split index |
| Parent evidence matrix | `../organization-membership-invitation.md` |
| Standard | `../../hierarchical-test-case-decomposition.md` |
| Last Reviewed | 2026-07-14 |

## Flow Tree

```text
Organization Governance
├── Create organization
├── Current organization/project context
├── Invitation
│   ├── Send invitation
│   ├── Invitee inbox
│   ├── Accept invitation
│   └── Reject invitation
├── Join request
├── Member role/remove
└── Ownership transfer
```

## Split Matrices

| Matrix | Purpose |
|---|---|
| `create-context.md` | Atomic organization create/current-context rows |
| `invitation-send.md` | Atomic invitation send/validation rows |
| `invitation-response.md` | Atomic invite accept/reject and seeded E2E gap |
| `join-request.md` | Atomic join submit/approve/reject rows |
| `membership-role.md` | Atomic member list/role/remove rows |
| `ownership-transfer.md` | Atomic ownership transfer rows |
