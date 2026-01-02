# Auth session evidence: durability and reconciliation

## Runtime contract

`auth:session:observed:v1` is the canonical source for login/logout Audit
evidence. Each event has a stable UUID `eventId`. The domain outbox deduplicates
on that ID, and the consumer commits its receipt and critical Audit row in one
PostgreSQL transaction. `audit_events.source_occurred_at` preserves the
producer-observed session time; `audit_events.occurred_at` remains the
database-assigned monotonic hash-chain order.

The consumer can therefore be retried after a worker crash, lease loss, or ACK
failure without duplicating evidence. After successful delivery, the worker
replaces the processed outbox payload with a tombstone containing only
`eventId`, action, and occurrence time. IP address, user agent, request ID, and
trace ID remain only while delivery or DLQ recovery needs them.

## Non-atomic session boundary

Web sessions are not stored in the same PostgreSQL transaction as the domain
outbox. The application must not claim atomicity across these systems.

- Login: the web session is established first. The standalone outbox
  transaction is awaited immediately afterward.
- Logout: the web session is revoked first. Outbox staging and realtime
  connection revocation are independent post-revocation effects.
- A staging failure never converts an already completed login/logout into a
  false rollback or HTTP failure. Logout security always takes priority.

The unavoidable evidence-loss window starts after the session mutation
completes and ends when the outbox insert commits. A process crash or complete
PostgreSQL outage inside that window can leave a real session outcome without
an outbox row. PostgreSQL cannot reconcile this automatically because it is
not the authoritative session store.

## Detection and reconciliation

Failed staging emits the bounded diagnostic `Auth post-commit effect failed`
with:

- `effectName` (`auth.login.durable_stage` or
  `auth.logout.durable_stage`);
- committed auth outcome;
- user ID and stable event ID;
- error class only (no raw exception, IP address, user agent, or session ID).

Operations should alert on either durable-stage effect name. For each alert:

1. Correlate the stable event ID with request/platform logs and the
   authoritative identity-provider or session record.
2. Confirm the actual login/logout outcome and occurrence time. Never infer a
   success only from an attempted callback.
3. Re-stage the original validated `auth:session:observed:v1` payload using the
   same event ID after PostgreSQL recovers. Reusing the ID makes repeated
   reconciliation safe.
4. Verify one processed outbox row, one
   `auth_session_event_receipts` row, one audit event with
   `correlation_key = eventId`, `schema_version = 3`, and
   `source_occurred_at` equal to the validated observation time.
5. Escalate any `AUTH_SESSION_RECEIPT_COLLISION` as an integrity incident;
   never overwrite the existing receipt.

`retired_user_activity_events` is a read-only migration archive. It is not
part of runtime reconciliation and must never be used to fabricate or repair a
canonical receipt/Audit pair.

There is intentionally no automatic reconstruction from PostgreSQL and no
Redis/cache mutation in this workflow.
