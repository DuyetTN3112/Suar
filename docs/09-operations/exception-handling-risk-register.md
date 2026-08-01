# Exception-handling risk register

| Field         | Value                                       |
| ------------- | ------------------------------------------- |
| Status        | Active                                      |
| Scope         | Backend application and operational workers |
| Owner         | Engineering / platform                      |
| Last reviewed | 2026-07-26                                  |

This register records exception risks that still need architectural work. It
does not treat a passing narrow unit test as proof that the entire application
is complete.

## Controls verified in the current audit

| Boundary              | Verified control                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HTTP                  | Canonical exceptions, safe Problem Details, hostile-object barriers, PostgreSQL classification, redacted reporting                                                                                                       |
| Audit                 | Truthful best-effort result, critical propagation, bounded middleware deadline, no raw diagnostic persistence                                                                                                            |
| Domain outbox         | Ordering, lease fencing, timeout/shutdown handling, DLQ administration, processed-row retention                                                                                                                          |
| Project lifecycle     | Create/update/delete stage a bounded durable event in the mutation transaction; search delivery is abort-aware, externally version-fenced, hard-delete convergent, and isolated from best-effort compatibility listeners |
| Auth session          | Durable event identity, idempotent receipt, atomic canonical-Audit consumer, source occurrence timestamp, processed-payload tombstone                                                                                    |
| Notification          | Fanout shutdown, isolated sibling failure, authorized retention, idempotent physical-index deletion                                                                                                                      |
| Persisted projections | Fail-closed review confirmations, talent explainability, user-skill catalog, recommendation trust data                                                                                                                   |
| Debug operations      | AI-dispute trigger no longer deletes shared tables or uses overlapping async interval callbacks                                                                                                                          |

## Open risks

| Priority | Risk                                                                                                                                       | Required closure evidence                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| P1       | Session mutation and PostgreSQL outbox staging cannot commit atomically                                                                    | Reconciliation telemetry and a fault-injection exercise proving stable-event-ID recovery                       |
| P1       | Organization, project membership/ownership, and user lifecycle event settlement still relies on in-process delivery in some workflows      | Per-workflow outbox adoption, idempotent consumer receipt where effects are non-idempotent, crash/replay tests |
| P1       | Critical audit atomicity is selected by each workflow rather than globally enforceable                                                     | Mutation inventory proving every critical write shares its transaction client                                  |
| P1       | Notification outbox graceful shutdown remains coupled to cache/Redis work owned by another stream                                          | Owner-provided shutdown and datastore-isolation tests; no duplicate implementation here                        |
| P1       | Application deadlines are not propagated as cancellation signals into every database query and downstream SDK                              | Disconnect/deadline fault tests proving abandoned work is cancelled within a bounded interval                  |
| P1       | Mutation endpoints do not yet have a complete idempotency and ambiguous-outcome inventory                                                  | Route-by-route policy, persistence uniqueness, replay/reconciliation tests                                     |
| P1       | OAuth provider deadline does not abort the underlying Ally transport request                                                               | Abortable provider transport or an upstream contract exposing cancellation, with stalled-request resource test |
| P1       | Log privacy governance still lacks deployment retention/access evidence after direct routine auth identity attributes were removed         | PII-purpose inventory, pseudonymous dimensions, access control and retention evidence                          |
| P1       | Generic `BusinessLogicException` remains on transitional paths and can flatten 403/404/409/422/500 semantics                               | Reduce the active per-module no-growth gate budgets to zero through domain-by-domain semantic migration        |
| P2       | Additional legacy JSON readers may intentionally default malformed external input but must be distinguished from application-owned storage | Source-by-source provenance inventory plus integrity tests for every persisted reader                          |
| P2       | Global TypeScript/gate results can be temporarily obscured by concurrent refactors in the shared worktree                                  | Clean-tree CI run covering typecheck, lint, architecture gates, unit and datastore integrations                |

## Operating constraints

- No deployment is part of this development-stage audit.
- Redis/cache implementation is owned by a separate workstream. This audit may
  consume its published contracts but must not duplicate or overwrite its work.
- When search is intentionally disabled by configuration, durable projection
  events are acknowledged without contacting Elasticsearch. Enabling search
  therefore requires the supported full-reindex operation before serving
  search traffic.
- Destructive operations require an environment-bound service principal,
  bounded batch, reason, exact confirmation, critical audit, and fail-closed
  transaction semantics.
- Every closed item requires a fault-injection regression test demonstrating
  the original failure, not only a happy-path test.
