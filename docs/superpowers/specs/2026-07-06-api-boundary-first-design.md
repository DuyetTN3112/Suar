# API Boundary-First Refactor Design

## Goal

Standardize public JSON API boundary for current AdonisJS + Inertia app without breaking existing Inertia flows, while creating migration seams that map cleanly to future NestJS guards/interceptors/exception filters.

## Problem Statement

Current repo already has partial API standardization, but public API behavior is still governed by multiple overlapping mechanisms:

- `HttpExceptionHandler` splits legacy `/api/*` and canonical `/api/v1/*` errors.
- `AuthMiddleware` and `OrganizationResolverMiddleware` detect API requests by URL prefix and `Accept` negotiation.
- public JSON responses are often wrapped as `{ data: ... }`, but response and error decisions are still distributed.
- some middleware returns legacy `createApiError(...)` inline while `/api/v1/*` returns Problem Details.

This means current transport policy is path-driven, not boundary-driven.

## Scope

This refactor covers boundary policy only:

- transport classification
- public JSON error serialization direction
- shared API response/error helpers used by middleware/controllers
- migration-safe behavior for current legacy and v1 routes

This refactor does not:

- rename route families yet
- remove legacy aliases
- refactor domain logic
- change Inertia page rendering contracts

## Current Evidence

Main hotspots:

- `app/modules/http/exceptions/handler.ts`
- `app/modules/auth/middleware/auth_middleware.ts`
- `app/modules/organizations/middleware/organization_resolver_middleware.ts`
- `app/modules/http/errors/error_utils/controller_handlers.ts`

Observed issues:

1. `HttpExceptionHandler` uses `request.url().startsWith('/api/')` and special-cases `/api/v1`.
2. `AuthMiddleware` re-implements API request detection separately.
3. `OrganizationResolverMiddleware` uses `Accept` negotiation directly and returns inline legacy API error envelopes.
4. helper `handleApiControllerError(...)` returns legacy `createApiError(...)` and does not align with canonical Problem Details direction.

## Design Principles

### 1. One transport classifier

Introduce one shared boundary classifier for HTTP requests.

Classifier should distinguish at least:

- `page`
- `api-canonical`
- `api-compat`
- `api-admin-internal`
- `api-public-callback`
- `api-ops-internal`

Reason:

- removes repeated URL sniffing
- gives future NestJS route metadata equivalent
- keeps Inertia behavior separate from API behavior

### 2. One public JSON error direction

Canonical direction stays:

- Problem Details
- `application/problem+json`
- request/correlation IDs preserved

Compatibility rule:

- legacy `/api/*` routes may temporarily keep current shape only where necessary
- but error serialization decision should come from shared helper, not scattered middleware/controller code

### 3. Shared helper, not ad hoc branching

Boundary code should expose small shared helpers for:

- request classification
- JSON error response emission
- Inertia/page redirect decisions

Controllers and middleware should not manually decide transport semantics repeatedly.

### 4. Inertia stability first

Page routes and Inertia redirects must preserve current behavior:

- unauthenticated page request still redirects to login
- unauthorized Inertia request still relocates correctly
- page flows must not suddenly receive Problem Details JSON

### 5. Legacy alias safety

No legacy route removal in this phase.

This phase only changes who decides behavior, not which public URLs exist.

## Approaches Considered

### Approach A. Directly convert all `/api/*` errors to Problem Details now

Pros:

- fastest convergence

Cons:

- high compatibility risk
- likely breaks unknown clients and current assumptions

Decision:

- reject for first runtime phase

### Approach B. Add shared classifier + shared emitter, preserve legacy/compat behavior initially

Pros:

- migration-safe
- reduces duplication first
- enables later canonicalization by flipping one boundary

Cons:

- temporary dual error shapes still remain

Decision:

- recommended

### Approach C. Skip boundary, refactor one route family first

Pros:

- smaller first diff

Cons:

- leaves cross-cutting drift intact
- every later family refactor must re-solve same boundary problem

Decision:

- defer

## Recommended Design

Use Approach B.

### New Boundary Building Blocks

Add a shared boundary utility module in `app/modules/http` that:

1. classifies request transport
2. exposes `isPageRequest`, `isCanonicalApiRequest`, `isCompatApiRequest`, `isAnyApiRequest`
3. emits canonical Problem Details
4. emits compatibility JSON errors where still needed

This utility becomes single source of truth for:

- exception handler
- auth middleware
- organization boundary middleware
- controller error helpers

### Request Classification Rules

Initial classification logic may still use path and headers internally, but only in one place.

Priority:

1. `X-Inertia` => page/inertia request
2. explicit canonical prefixes (`/api/v1`)
3. explicit legacy API/internal prefixes (`/api/`)
4. content negotiation fallback only for ambiguous non-prefixed requests

Important:

- callers outside classifier must not inspect URL prefixes directly

### Error Emission Rules

Canonical:

- `api-canonical` => Problem Details

Compatibility:

- `api-compat`, `api-admin-internal`, `api-ops-internal` may keep current legacy envelope for now
- but all must use same shared emitter

Page:

- redirect / flash / Inertia location remains page-specific

### Middleware Refactor Rules

`AuthMiddleware`

- stop owning custom API detection logic
- ask shared classifier whether request is API-compatible or page

`OrganizationResolverMiddleware`

- stop writing inline `createApiError(...)`
- delegate to shared compat/canonical error emitter based on transport class

`HttpExceptionHandler`

- stop re-defining request category locally
- consume shared classifier + shared error emitter

`handleApiControllerError(...)`

- stop owning legacy-only error response semantics
- route through shared boundary emission

## Behavior Invariants

After this phase, all of these must remain true:

1. existing Inertia page login redirects still work
2. current `/api/v1/*` validation errors still return Problem Details
3. legacy `/api/*` endpoints that already have contract coverage still keep expected body shape unless intentionally reclassified
4. request and correlation IDs stay present in canonical errors
5. no route renames required

## Testing Strategy

Use existing contract coverage where available, then add focused boundary tests.

Minimum test additions:

1. request classification unit tests
2. exception handler tests for:
   - canonical validation error
   - compat validation error
   - page unauthorized redirect
3. middleware tests for:
   - unauthenticated API request
   - unauthenticated page request
   - no-organization canonical vs compat behavior

Existing contract suites to protect against regression:

- user context API standardization
- task statuses/workflow API contracts
- project API standardization

## Risk Assessment

GitNexus impact:

- `HttpExceptionHandler`: MEDIUM
- `AuthMiddleware`: MEDIUM
- `OrganizationResolverMiddleware`: MEDIUM

Risk is acceptable because:

- blast radius is meaningful but not critical/high
- behavior change can be constrained to boundary helpers
- existing route surface remains intact

Main risk:

- unintentionally reclassifying a current request path

Mitigation:

- central classifier tests
- use allowlist/prefix mapping in first phase rather than heuristic-only detection

## File-Level Design

Likely files touched in implementation phase:

- create shared boundary classifier/emitter module under `app/modules/http`
- modify `app/modules/http/exceptions/handler.ts`
- modify `app/modules/auth/middleware/auth_middleware.ts`
- modify `app/modules/organizations/middleware/organization_resolver_middleware.ts`
- modify `app/modules/http/errors/error_utils/controller_handlers.ts`
- add or extend focused unit/integration tests under `app/modules/http/tests`

## Migration Sequence

1. introduce shared transport classification helper
2. cover helper with unit tests
3. route `HttpExceptionHandler` through shared helper
4. route `AuthMiddleware` through shared helper
5. route `OrganizationResolverMiddleware` through shared helper/emitter
6. route controller error helper through shared helper/emitter
7. run contract tests for covered families

## Out of Scope For This Phase

- converting all compat APIs to Problem Details
- route renames like `projects_v1` cleanup
- bookmark family naming normalization
- tasks/reviews family canonicalization
- admin/internal namespace separation

## Expected Outcome

At the end of this phase:

- public API transport policy is centralized
- current app behavior stays stable
- later route-family migrations become simpler
- future NestJS migration gets clear equivalents for:
  - exception filter
  - auth guard transport branching
  - organization guard transport branching

## Decision

Proceed with boundary-first refactor using shared transport classification and shared error emission, while preserving current route inventory and current Inertia behavior.
