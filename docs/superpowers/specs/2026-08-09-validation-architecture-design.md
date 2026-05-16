# Suar Validation Architecture Design

| Field | Value |
|---|---|
| Status | Proposed |
| Date | 2026-08-09 |
| Scope | HTTP input validation, application contextual validation, domain invariants, error contracts, and enforcement |
| Owners | Engineering, module owners, QA |
| Related audit | `validate.md` and the validation architecture audit completed 2026-08-09 |
| Related architecture | `docs/03-architecture/application-boundary.md`, `docs/03-architecture/suar-module-layer-contract.md` |

## 1. Decision summary

Suar will not introduce a global `ValidationService`, a cross-module validator registry, or a
generic validation framework. Validation remains owned by the bounded context that understands the
rule, but every validation step must have an explicit architectural owner and a stable failure
contract.

The canonical request path is:

```text
route and middleware
  -> request mapper
  -> transport schema validator
  -> canonical action input
  -> one Command or Query
  -> authorization and contextual checks
  -> domain policy / invariant
  -> transaction and persistence safety
  -> Result or typed exception
  -> HTTP error boundary
```

The design has five validation layers:

1. Transport schema validation: shape, type, presence, format, enum, length, and bounded size.
2. Canonical input mapping: alias normalization and conversion into a typed action input.
3. Application contextual validation: authorization, tenant/resource ownership, existence,
   concurrency, and current-state checks.
4. Domain validation: lifecycle transitions, aggregate invariants, formulas, and business policy.
5. Persistence safety: uniqueness, foreign keys, check constraints, idempotency, and transaction
   isolation as the final safety net.

Expected malformed-input failures are represented by the canonical validation error contract.
Expected application/domain rejections cross the Command/Query boundary as typed `Result.fail`
values or typed application exceptions. Unexpected failures remain thrown and are handled as
infrastructure or internal errors.

## 2. Problem statement

Suar already has a modular-monolith architecture with Commands, Queries, request mappers, domain
policies, outbound ports, adapters, and a shared Result container. The current weakness is not a
missing architectural layer; it is inconsistent enforcement of the existing layers.

The audit found these recurring conditions:

- some endpoints use VineJS schemas while others parse request bodies directly in controllers;
- request values are frequently asserted with `as Record<string, unknown>` instead of validated;
- wrong-type fields are sometimes converted into empty strings, null, false, or omitted fields;
- custom DTOs, VineJS errors, `FieldValidationResult`, and domain exceptions expose different
  error shapes;
- some domain policies throw HTTP-oriented `ValidationException` values directly;
- a controller can split one business workflow across multiple Commands;
- public contract type assertions are sometimes stronger than runtime validation;
- architecture guards check module/dependency placement but do not yet enforce validation ownership;
- tests prove many happy paths but do not consistently cover malformed runtime payloads.

The result is a system where a bad request can be rejected correctly, silently normalized, or become
an unexpected `TypeError`, depending on the route family.

## 3. Goals and non-goals

### Goals

- Define one validation ownership model for every Suar module.
- Make every external input cross a runtime validation boundary before entering a Command or Query.
- Preserve module ownership and avoid a global validator dependency.
- Standardize validation issue paths, stable codes, and HTTP serialization.
- Separate malformed transport input from authorization, business, dependency, and internal errors.
- Preserve the existing Result architecture and exception handler behavior.
- Make validation architecture mechanically enforceable with tests and static checks.
- Migrate incrementally without changing valid business behavior.

### Non-goals

- Replacing VineJS with Zod or another schema library.
- Rewriting every domain policy in one release.
- Creating a shared cross-feature `services` or `validators` directory.
- Moving authorization into request schemas.
- Treating frontend validation as a security boundary.
- Removing database constraints that protect integrity.
- Merging module-local BaseCommand/BaseQuery classes.
- Redesigning API namespaces or removing compatibility routes.

## 4. Architectural principles

### 4.1 Trust boundary first

Every value from HTTP, browser forms, query strings, route parameters, callbacks, jobs, CLI input,
or external providers is untrusted. TypeScript types do not establish runtime trust.

The following are not validation:

```ts
payload as CreateTaskInput
body as Record<string, unknown>
value as 'draft' | 'active'
```

Assertions are allowed only after a runtime guard has established the asserted shape.

### 4.2 One owner per rule

The layer that owns the meaning of a rule owns its implementation:

| Rule | Owner |
|---|---|
| JSON object, field type, required field, string length, enum, UUID format | module request mapper/schema |
| camelCase/snake_case alias and transport defaults | module request mapper |
| current actor, organization/project scope, resource existence | Command/Query and outbound port |
| permission and role eligibility | authorization/application policy |
| lifecycle transition and aggregate invariant | module domain |
| uniqueness, atomicity, concurrency safety | transaction/persistence boundary |
| HTTP response shape | HTTP exception handler and response mapper |

The same cheap syntax rule may be duplicated in frontend and backend for UX, but the backend remains
the source of truth.

### 4.3 Controller thinness is a validation requirement

Controllers may extract transport data and invoke one request mapper plus one Command/Query. They
must not normalize business semantics, silently default malformed values, or split a workflow across
multiple use cases.

### 4.4 Domain does not decide HTTP

Domain rules should expose a stable domain decision or domain violation. Application code maps that
decision to `AppException`/`Result` at the application boundary. Existing direct
`ValidationException` throws are transitional debt and may be migrated slice by slice.

### 4.5 Expected and unexpected failures stay distinct

```text
Expected malformed request       -> canonical validation failure
Expected authorization/business  -> typed Result failure or AppException
Dependency/infrastructure fault  -> typed dependency exception, thrown or Result failure
Programming/invariant corruption -> thrown internal/invariant exception
```

`Result` is not an HTTP serializer. The HTTP boundary remains the only place that chooses the
transport envelope.

## 5. Canonical validation contracts

### 5.1 Validation issue

The shared error kernel should expose a transport-neutral issue shape under
`app/modules/errors/public_contracts`:

```ts
export interface ValidationIssue {
  readonly code: string
  readonly path: string
  readonly message: string
  readonly rule?: string
}
```

`path` uses dot notation with numeric array indexes, for example:

```text
name
incompleteTasks.0.destination
evidenceRelations.2.relation
criteria.page.size
```

`code` is stable and machine-readable. `message` is safe for the current client locale. A message
must not be used as a programmatic discriminator.

### 5.2 Validation failure

The canonical application error carries all issues:

```ts
export interface ValidationFailureDetails {
  readonly issues: readonly ValidationIssue[]
}
```

The existing `ValidationException` remains the compatibility adapter for thrown validation failures.
Its `errors` field may continue to support the legacy `Record<string, string>` shape during migration,
but new code must preserve the canonical issue list before legacy flattening.

The mapping rules are:

- duplicate issue paths keep the first message in the legacy map;
- canonical issues are never discarded merely because the legacy map is flat;
- an object-level error uses path `body`, `request`, or the nearest named field;
- empty issue lists are invalid for a validation failure;
- internal causes and database diagnostics never enter client issues.

### 5.3 Canonical action input

A request mapper returns a fully normalized input. It does not return `unknown`, a partially typed
record, or a DTO whose fields still have transport aliases.

Example:

```ts
export interface CreateProjectSprintInput {
  readonly projectId: string
  readonly name: string
  readonly startsAt: string
  readonly endsAt: string
  readonly goal?: string | null
  readonly status?: 'draft'
}
```

`status: 'active'` must be rejected at transport/application input if the public create contract
does not allow it. It must not be accepted through a cast and rejected only after partial workflow
execution.

## 6. Layer responsibilities in detail

### 6.1 Request mapper and transport schema

Each externally callable mutation has a module-owned request mapper under
`controllers/mappers/request` or an explicitly named module validator used by that mapper.

The mapper must:

- verify the top-level body/query/params container;
- distinguish missing, null, empty, and wrong-type values;
- normalize supported aliases once;
- validate enums and bounded values;
- validate nested array/object items with indexed paths;
- return a canonical input;
- throw only the canonical validation error for malformed input.

The mapper must not:

- query the database;
- resolve permissions;
- inspect current aggregate state;
- open a transaction;
- invoke a Command or Query;
- silently coerce invalid input into a valid-looking default.

VineJS remains the default schema tool. Manual guards are acceptable for dynamic/versioned payloads
when they produce the same issue contract and have focused negative tests.

### 6.2 Command and Query

Commands and Queries receive canonical inputs. They own contextual validation that needs execution
context or external state:

- authentication requirement;
- organization/project/tenant scope;
- resource existence and visibility;
- actor authorization and role eligibility;
- optimistic concurrency;
- current lifecycle state;
- cross-module facts through consumer-owned outbound ports.

An endpoint method must not call two independent use cases to complete one business intent. If a
Sprint delivery end also opens the Review boundary, an application orchestration Command owns that
sequence and returns one result.

### 6.3 Domain policies

Domain policies own pure rules and state transitions. They should be callable from unit tests without
HTTP, Lucid, Redis, or Adonis context.

Preferred return forms are:

```ts
type PolicyDecision<TCode extends string = string> =
  | { allowed: true }
  | { allowed: false; code: TCode; details?: Record<string, unknown> }
```

or a domain-specific violation value when a rule requires multiple issues. The application layer
maps the result to a client-safe application error.

### 6.4 Persistence safety

Application validation does not replace database protection. A successful pre-check may race with a
concurrent writer. Commands must retain transaction, lock, unique, idempotency, and optimistic
version protections.

Database errors must be mapped according to their meaning:

- expected uniqueness conflict → conflict error;
- missing referenced resource → not-found or validation error according to the public contract;
- dependency outage → retryable dependency exception;
- unknown constraint/data corruption → invariant/internal exception.

## 7. Canonical data flow

```text
HTTP request
  │
  ├─ route/auth/org middleware
  │    establishes transport and execution context
  │
  ├─ request mapper
  │    aliases + runtime schema + canonical issue paths
  │
  ├─ controller
  │    invokes exactly one Command/Query
  │
  ├─ Command/Query
  │    auth + contextual checks + transaction intent
  │
  ├─ domain policy
  │    pure lifecycle/invariant/business decision
  │
  ├─ outbound port/adapter
  │    existence, persistence, external dependency, concurrency
  │
  ├─ Result<T, AppException> or thrown typed exception
  │
  └─ HTTP handler
       one canonical problem response + compatibility envelope where required
```

## 8. Representative vertical slices

### 8.1 Sprint planning

Required schemas:

- create Sprint;
- update Sprint;
- start Sprint;
- move task to Sprint;
- reorder Product Backlog;
- end Sprint delivery.

Required domain/application rules:

- at most one active Sprint per Project;
- destination Sprint belongs to the same Project;
- destination Sprint is draft or active;
- incomplete tasks require an explicit destination;
- historical assignments are append-only;
- delivery end and Review handoff are one application intent.

### 8.2 Review observation

The request mapper must validate:

- observation envelope shape and version;
- UUID fields;
- evidence relation enum;
- evidence relation uniqueness and paths;
- evidence sufficiency enum;
- rationale classification enum;
- idempotency key bounds.

The domain/application layer must validate:

- reviewer eligibility;
- assignment snapshot consistency;
- evidence access;
- completion claim relationship;
- review governance state.

### 8.3 Task authoring and submission

Existing Task schemas and versioned public contract validators remain module-owned. They must be
composed in the request mapper without allowing a type assertion to bypass runtime schema checks.
Readiness, evidence coverage, assignment snapshot, and completion rules remain application/domain
concerns, not generic transport validation.

## 9. API and frontend contract

Canonical `/api/v1` responses use Problem Details with:

```json
{
  "type": "about:blank",
  "title": "Validation failed",
  "status": 422,
  "code": "E_VALIDATION",
  "category": "validation",
  "detail": "The request is invalid.",
  "errors": {
    "incompleteTasks.0.destination": "Destination is required"
  },
  "requestId": "...",
  "correlationId": "..."
}
```

The canonical issue list may be added as an additive field only if the API contract version permits
it. Compatibility routes continue receiving the existing flattened `errors` object during migration.

Frontend forms may use a shared adapter that converts the response into field errors, but frontend
rules remain UX helpers and cannot be treated as backend authorization or business validation.

## 10. Testing and verification contract

Every request mapper must cover at least:

1. valid minimum payload;
2. valid complete payload;
3. missing required field;
4. null where not allowed;
5. wrong primitive type;
6. empty/whitespace value;
7. invalid enum;
8. invalid UUID/date;
9. boundary length/number;
10. nested malformed item with indexed path;
11. unknown field policy;
12. alias collision when both camelCase and snake_case are present.

Every Command/Query must cover:

- unauthorized actor;
- foreign tenant/project/resource;
- current-state rejection;
- concurrency/idempotency rejection;
- dependency failure mapping;
- no mutation after validation failure;
- transaction rollback where applicable.

Every domain policy must cover truth tables for allowed and rejected transitions without HTTP boot.

Every HTTP contract must verify status, error code, field paths, request/correlation IDs, and absence
of raw diagnostics.

## 11. Enforcement and architecture gates

Add a validation architecture check that reports:

- request body/query/params assertions in controllers;
- mutation controllers without a request mapper/schema;
- controllers invoking multiple Commands/Queries in one endpoint method;
- domain files importing VineJS, HTTP context, or transport mappers;
- request mappers performing database or outbound calls;
- new validation result shapes outside the canonical error contract;
- schema validators without corresponding negative test files;
- direct defaulting of wrong-type request values in mutation mappers.

The check must be introduced as a ratchet: existing findings are inventoried first, then new findings
fail CI. It must not block unrelated legacy cleanup until each slice is migrated.

## 12. Migration policy

- Preserve valid request behavior unless the public contract explicitly says otherwise.
- Reject malformed input consistently; do not silently broaden accepted input.
- Migrate one vertical slice at a time.
- Add negative tests before changing the implementation.
- Keep compatibility error envelopes until all consumers migrate.
- Do not change module ownership to simplify validation.
- Run architecture checks and focused tests after each slice.
- Run `gitnexus detect-changes` before any commit containing code changes.

## 13. Acceptance criteria

This design is considered implemented when:

- all prioritized mutation endpoints have explicit request mappers and runtime schemas;
- no prioritized controller uses request type assertions as validation;
- each endpoint invokes one application intent;
- validation failures expose stable codes and field paths;
- domain rules are independently testable without HTTP;
- expected application failures use the Result/error contract;
- malformed inputs cannot become uncaught `TypeError` responses;
- Sprint, Review Observation, and Task slices pass unit, integration, contract, and relevant E2E
  negative tests;
- the validation architecture ratchet passes with no new violations;
- architecture, typecheck, lint, contract, and focused test evidence is recorded.

