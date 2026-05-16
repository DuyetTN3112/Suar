# Testing Seed Ownership Ledger

## Status

Proposed follow-up for the internal testing surface. The current `seed-cleanup` endpoint is
transport-hardened, but still discovers rows by seed markers and then traverses foreign keys. That
is bounded and useful for the existing test suite, but it is not proof of exact row ownership.

This document defines the design required before replacing marker discovery with exact cleanup.

## Problem

Testing seed flows create rows through factories, Lucid models, direct query-builder inserts, and
helper functions. They do not currently share one transaction or carry a common ownership
identifier. Adding a ledger without changing that boundary would record only a subset of rows and
would create false confidence.

The cleanup contract must guarantee:

1. A cleanup request can target only a validated seed run.
2. Every row created by that run is either recorded in the ledger or the seed run fails.
3. Cleanup deletes only rows recorded for that run, in dependency-safe order.
4. A failed or abandoned seed run cannot cause unrelated application data to be deleted.

## Target architecture

```text
seed request
  -> request mapper (timestamp/nonce/options)
  -> seed_run_id
  -> one database transaction
       -> SET LOCAL suar.testing_seed_run_id
       -> seed factories / raw inserts
       -> AFTER INSERT trigger records (run, table, row id)
  -> commit

seed-cleanup(seed_run_id)
  -> validate run ownership/state
  -> transaction
       -> read ledger rows
       -> delete children before parents
       -> mark run cleaned
  -> commit
```

## Schema

Add a migration for:

### `testing_seed_runs`

- `id uuid primary key`
- `seed_key varchar(128) not null`
- `route_name varchar(160) not null`
- `status varchar(16) not null` (`active`, `committed`, `failed`, `cleaned`)
- `created_at timestamptz not null`
- `committed_at timestamptz null`
- `cleaned_at timestamptz null`

Unique `(route_name, seed_key)` prevents ambiguous repeated cleanup requests while allowing the
same marker to be used by different fixture routes.

### `testing_seed_ownership`

- `seed_run_id uuid not null references testing_seed_runs(id) on delete cascade`
- `table_name varchar(128) not null`
- `row_id text not null`
- `created_at timestamptz not null`
- primary key `(seed_run_id, table_name, row_id)`

The table name is an allowlisted physical table name, never a request-supplied identifier. Row IDs
are stored as text so the ledger can cover UUID and numeric primary keys without weakening the
source table constraints.

## Recording ownership

The seed request creates the run and starts one transaction. It sets a transaction-local setting:

```sql
select set_config('suar.testing_seed_run_id', '<uuid>', true);
```

An `AFTER INSERT` trigger function records the inserted row only when the local setting is present
and the table is in the explicit seedable-table allowlist. The trigger must derive the primary key
from the row, not accept a row ID from application input.

The migration must install triggers only on tables whose primary key shape and deletion ordering
are known. Tables without a stable primary key are not seedable until they are explicitly handled.

If a seed route performs an insert outside the transaction, the route must fail closed. It must not
return a committed seed run while silently leaving unowned rows behind.

## Cleanup

`seed-cleanup` accepts a `seed_run_id` or an exact `(route_name, seed_key)` lookup resolved by the
server. It must not accept arbitrary text tokens for the ledger path.

Cleanup runs in a transaction and:

1. locks the run row;
2. requires `status = committed`;
3. loads ownership rows from the allowlisted tables;
4. deletes child rows before parent rows using a fixed dependency plan;
5. verifies no ownership rows remain for the run;
6. marks the run `cleaned`.

If a delete fails, the transaction rolls back and the run remains `committed` for retry. There is no
fallback to `ILIKE`, marker discovery, or broad table deletion.

## Rollout

1. Add schema and migration checksum/ledger entries.
2. Add a seed-run application service and transaction-local context.
3. Migrate one representative flow (`seed-project-member-flow`) and prove exact cleanup.
4. Migrate remaining routes in batches, including helper functions and raw inserts.
5. Add a coverage guard that fails when a mounted seed route is not ledger-enabled.
6. Remove marker-based deletion only after all routes pass the guard.

The current marker-based cleanup remains the compatibility path during rollout, but it must stay
bounded by the request mapper and escaped LIKE matching. It must not be described as exact ownership.

## Required verification

- A seed run creates rows in at least three parent/child tables and cleanup removes exactly those
  rows.
- A similarly named non-test row survives cleanup.
- A failed transaction leaves no ledger rows and no created fixture rows.
- Concurrent runs with different IDs cannot delete each other.
- Repeating cleanup is idempotent.
- An unregistered/raw insert causes the seed run to fail closed.
- Migration ledger/checksum and architecture guards pass.
