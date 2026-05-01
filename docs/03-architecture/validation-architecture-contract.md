# Suar Validation Architecture Contract

Status: normative after the 2026-08-09 validation audit

This contract defines where validation belongs in Suar. It complements the module-layer contract
and the application-boundary contract; it does not introduce a global validator service.

## Canonical request path

```text
route/middleware → request mapper/schema → canonical input → one Command/Query
→ authorization/context → domain policy → transaction/persistence → Result/typed exception
→ HTTP error boundary
```

Every external value is untrusted at runtime. TypeScript assertions are allowed only after a runtime
guard has proved the asserted shape.

## Ownership

| Concern | Owner |
|---|---|
| shape, type, presence, format, enum, size | module request mapper/schema |
| camelCase/snake_case aliases and transport defaults | module request mapper |
| actor, tenant, resource existence, current state | Command/Query and outbound ports |
| permission and role eligibility | authorization/application policy |
| lifecycle and aggregate invariants | module domain policy |
| uniqueness, foreign keys, atomicity, concurrency | transaction/persistence |
| response envelope and HTTP status | HTTP boundary |

Controllers may extract transport data, invoke one mapper, and invoke exactly one application
intent. They must not silently coerce malformed values or coordinate multiple Commands/Queries.

## Canonical validation issue

```ts
interface ValidationIssue {
  readonly code: string
  readonly path: string
  readonly message: string
  readonly rule?: string
}
```

Paths use dot notation and numeric indexes (`incompleteTasks.0.destination`). Codes are stable
machine-readable identifiers; messages are client-safe text and never programmatic discriminators.
Duplicate paths preserve the first message in the legacy flat error map, while the canonical issue
list remains complete.

`ValidationException` is the compatibility adapter for expected malformed-input failures. New
validation code must create canonical issues first. Empty issue lists are invalid. Unexpected
exceptions remain thrown and are handled as internal/dependency failures.

## Layer rules

Request mappers must validate the top-level container, distinguish missing/null/wrong-type values,
normalize aliases once, validate nested items with indexed paths, and return a fully normalized
action input. They must not import database models, repositories, HTTP response emitters, or
composition-root adapters.

Commands/Queries own contextual checks such as authorization, tenant scope, resource existence,
concurrency, and current-state transitions. Domain policies remain transport-independent and do
not import `HttpContext`, VineJS, controllers, or HTTP mappers. Persistence constraints remain the
final integrity boundary.

Versioned public-contract validators remain pure schema/provenance checks. They do not decide
authorization or lifecycle transitions. Compatibility routes may retain legacy envelopes, but must
map into the same canonical action boundary.

## Required negative coverage

Each mutation endpoint must cover, as applicable: malformed top-level input, wrong types, missing
required fields, invalid enum/format, malformed nested items, authorization failure, domain
invariant failure, dependency failure, and rollback/idempotency behavior. A test that only asserts
that an exception was thrown is insufficient; it must assert the canonical path/code or the public
compatibility envelope.

## Enforcement

Run:

```text
pnpm run check:arch:backend:validation
```

The guard checks migrated mutation controllers for a request mapper and a single application intent.
The existing module-layer, domain-boundary, public-contract, and exception guards remain required.
Before committing, run `gitnexus detect-changes` and review dirty-worktree scope so unrelated
changes are not staged.

## Migration policy

Migration is vertical-slice based. Preserve valid behavior and legacy response fields while adding
canonical issue metadata. Migrate high-risk public mutation boundaries first: Sprint lifecycle and
backlog, Review Observation/Task workflows, and Task authoring/assignment. Existing direct domain
`ValidationException` usage is tracked transitional debt and is migrated when a slice has a domain
decision test and an application-boundary mapping test.
