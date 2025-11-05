# API And Module Boundary Design

## Goal

Standardize current AdonisJS + Inertia application around one industrial-grade API boundary and one low-coupling module boundary so future NestJS migration becomes a transport rewrite over stable contracts instead of a full behavioral redesign.

## Problem Statement

Repository already contains meaningful API-standardization groundwork:

- canonical `/api/v1/*` routes exist for many families
- transport binding and auth-contract binding already exist
- deprecation-policy, route-governance, and response-boundary scripts already exist
- several contract tests already assert `{ data: ... }`, camelCase, and Problem Details behavior

Repository still carries two systemic risks:

1. API surface is fragmented across page routes, legacy compat routes, canonical v1 routes, admin/internal routes, testing/ops routes, and callback routes.
2. Module interaction is still too loose in places. Existing `public_contracts/*` and `application/ports/*` seams are promising, but runtime and tests still show cross-module imports into internals such as `infra/*`. Current guardrail only blocks direct cross-module `domain/*` imports.

If not corrected now, future NestJS migration will inherit both transport drift and coupling drift.

## Scope

This design covers:

- route surface taxonomy
- canonical public API rules
- compatibility alias policy
- admin/internal/callback surface classification
- auth and transport boundary direction
- module-to-module communication rules
- guardrails needed to freeze drift
- phased rollout plan that preserves Inertia behavior

This design does not:

- replace AdonisJS now
- remove all legacy endpoints now
- require page flows to call HTTP APIs internally
- rewrite every module in one pass

## Current Evidence

Primary evidence from current repository:

- route files under `start/routes/*.ts`
- standards and audit docs under `docs/`
- transport binding:
  - `start/routes/api.ts`
  - `start/routes/api_v1.ts`
  - `start/routes/tasks.ts`
  - `start/routes/users.ts`
  - `start/routes/reviews.ts`
  - `start/routes/skills.ts`
  - `start/routes/organizations.ts`
  - `start/routes/organizations_current.ts`
  - `start/routes/admin.ts`
- existing cross-module seam examples:
  - `app/modules/users/actions/ports/user_external_dependencies_impl.ts`
  - `app/modules/projects/application/ports/project_organization_access.ts`
  - `app/modules/organizations/public_contracts/organization_public_api.ts`
- current guardrail:
  - `scripts/check_module_domain_boundary.mjs`
- contract-surface guardrail:
  - `scripts/check_public_contract_surface.mjs`

Observed route state:

- total routes around `396`
- API routes around `229`
- canonical v1 routes around `116`
- legacy compat routes around `80`

Observed module-boundary state:

- many modules already expose `application/ports/*`
- many modules already expose `public_contracts/*`
- some runtime/test code still imports cross-module `infra/*`
- current automated guard now blocks runtime cross-module internals and separately tracks
  `public_contracts/*` re-export debt through an explicit allowlist

Latest verification evidence from current audit:

- contract suite passed:
  - `756 passed`
  - command:
    - `pnpm exec node --import=@poppinss/ts-exec bin/test.ts --suites=contract`
- typecheck passed:
  - `pnpm exec tsc --noEmit --pretty false`
- latest fixed seam regressions were architectural, not business-rule defects:
  - auth-only notification APIs were incorrectly gated by organization middleware
  - `/api/me/reverse-reviews` in `me` scope was incorrectly treated as org-scoped
  - a few contract specs needed app bootstrapping/timeouts because heavy side effects made failures look like contract drift

## Design Principles

### 1. Public business API has one canonical namespace

Canonical public JSON API lives under `/api/v1/*`.

Meaning:

- every new public business endpoint lands in `/api/v1/*` first
- `/api/*` exists only as compatibility alias where needed
- page routes remain page routes

Reason:

- stable target for docs, tests, and client behavior
- easy mapping to future NestJS controllers/versioning

### 2. Surface taxonomy must be explicit

Current repo is not API-only. It needs explicit boundary classes:

- `page/web`
- `api-canonical`
- `api-compat`
- `api-admin-internal`
- `api-ops-internal`
- `api-public-callback`

Reason:

- keeps public business contract clean
- prevents admin/testing/dev endpoints from polluting product API standard
- aligns with existing `bindHttpTransport(...)` direction

### 3. Compatibility aliases are thin wrappers only

Legacy `/api/*` routes may remain temporarily, but they must not own:

- unique business logic
- unique DTO normalization
- unique response presenter
- unique error semantics

They may own only:

- path compatibility
- explicit deprecation metadata
- temporary request-shape normalization if legacy clients still need it

### 4. Page transport is not internal integration

Inertia pages must stay stable, but page routes are not public API and not module-integration seams.

Meaning:

- pages may call local actions/queries/services
- pages may share use-cases with canonical APIs
- backend modules must not call each other over local HTTP routes

Reason:

- avoids transport coupling inside monolith
- keeps migration seam at controller boundary, not between modules

### 5. Module-to-module communication is port-first

When one module needs another module’s capability:

- consumer defines required interface in its own `application/ports/*` or local action port
- provider supplies adapter implementation
- shared facts/events/rules may be exposed through provider-owned `public_contracts/*` only when the seam is intentionally stable

Consumer must not directly import another module’s:

- `actions/*`
- `controllers/*`
- `infra/*`
- `domain/*`
- internal helpers/support files

Reason:

- lowers overlap and circular pressure
- keeps each module replaceable
- maps cleanly to NestJS provider injection later

### 6. Public contracts stay thin

`public_contracts/*` is not a second service layer.

Allowed there:

- stable DTOs
- stable enums/constants
- published facts/events
- deliberately public rule helpers
- very small facade APIs when the module truly offers a supported public seam

Not allowed there:

- schema evidenceing ground for arbitrary cross-module helpers
- raw ORM model access
- broad orchestration logic

### 7. Transport and module seams are separate concerns

Do not solve module coupling by routing everything through HTTP.

Do not solve transport drift by letting module internals leak across boundaries.

Target model:

- controller/middleware own HTTP concerns
- actions/application layer own orchestration
- ports/public contracts own module seams

### 8. Organization context must be opt-in, not ambient

Organization context is not default for every authenticated route.

Rules:

- auth-only APIs must work with authenticated user context only
- org-scoped APIs must declare org requirement explicitly
- `me` APIs are user-scoped by default unless route contract says otherwise
- organization resolver fallback may exist during transition, but canonical direction is metadata-driven scope, not broad path heuristics

Reason:

- avoids accidental 403 on valid auth-only endpoints
- keeps future NestJS guard model explicit
- prevents "logged-in implies org-scoped" coupling from spreading

## Boundary Model

### A. Page / Web Surface

Includes:

- Inertia pages
- redirects
- flash/session UX flows
- SSR props

Rules:

- not public API contract
- may remain session-first
- must preserve current behavior during migration

### B. Canonical Public Business API

Includes:

- product-facing JSON endpoints under `/api/v1/*`

Rules:

- stable contract target
- `{ data: ... }` success envelope by default
- camelCase request/response casing
- Problem Details error direction
- explicit auth contract and transport binding
- must be documented and contract-tested

### C. Compatibility API

Includes:

- legacy `/api/*` business endpoints still needed by current frontend or clients

Rules:

- alias only
- same action/query/use-case as canonical endpoint
- same presenter intent
- deprecation headers where applicable
- no new business-only legacy endpoints

Compatibility alias implementation rule:

- compat and canonical routes should point to same action/query service whenever possible
- if separate controllers remain temporarily, request normalization and response mapping must still converge on one contract definition
- compat route must never become hidden source of unique authorization or organization-context behavior

### D. Admin / Internal API

Includes:

- `/api/admin/*`
- `/api/dev/*`
- `/api/testing/*`
- `/api/redis/*`
- telemetry/search/internal ops endpoints

Rules:

- separate from public business API
- may keep stricter internal semantics
- still require explicit transport binding, auth policy, and ownership
- must not be mistaken for product public API

### E. Public Callback / Integration Surface

Includes:

- OAuth callbacks
- AI dispute/public callbacks
- external integration entrypoints

Rules:

- documented separately
- not mixed into authenticated app API docs
- own auth/throttle/idempotency rules

## Module Boundary Model

### Allowed Patterns

1. Same-module internal import

- module may freely use its own `actions/*`, `domain/*`, `infra/*`, `controllers/*`

2. Cross-module via public contract

- import from provider’s `public_contracts/*` for stable DTO/event/rule/facade seam

3. Cross-module via consumer-owned port

- consumer defines interface in `application/ports/*`
- runtime adapter composes provider implementation

4. Cross-module via event/fact publication

- use versioned event/fact contracts where async seam is more appropriate than direct call

### Forbidden Patterns

1. Cross-module HTTP calls inside monolith

- no local `fetch('/api/...')` or client-style calls from backend module to backend module

2. Cross-module internal imports

- no direct imports from another module’s `actions/*`, `controllers/*`, `infra/*`, `domain/*`, `support/*`

3. Controller-to-controller reuse

- controllers may share actions/query services, not call each other

4. Public-contract abuse

- no moving arbitrary helper functions to `public_contracts/*` just to bypass guardrails

### Port Placement Rule

Default rule:

- consumer owns required capability interface in `application/ports/*`
- provider owns stable exported facts/facades in `public_contracts/*`
- runtime composition wires consumer port to provider adapter

Use provider `public_contracts/*` directly only when:

- capability is intentionally stable across multiple consumers
- exported API is thin and technology-agnostic
- consumer does not need provider internal workflow shape
- facade does not become a bypass for provider `actions/*`, `infra/*`, `services/*`, or bootstrap
  internals without explicit boundary review

Use consumer-owned port when:

- consumer needs only subset behavior
- capability may be reimplemented or mocked independently
- direct dependency on provider facade would over-couple orchestration

## Auth And Transport Direction

Current repo already has correct direction with:

- `bindHttpTransport(...)`
- `bindApiAuthContract(...)`

Required next-state:

- all JSON route families bind explicit transport class
- all relevant API route families bind explicit auth contract
- middleware and exception handling consume route-bound metadata first
- URL-prefix fallback remains only as transitional safety net, then shrinks over time

Transport classes remain:

- `api-canonical`
- `api-compat`
- `api-admin-internal`
- `api-ops-internal`
- `api-public-callback`
- `page`

## Recommended Approaches

### Approach A. API-first only, defer module boundary hardening

Pros:

- smaller immediate scope

Cons:

- NestJS migration still blocked by tight module coupling
- API standard would sit on unstable internals

Decision:

- reject

### Approach B. Big-bang rewrite to ports everywhere now

Pros:

- theoretically pure end state

Cons:

- too risky
- too disruptive for current Inertia app
- impossible to verify safely in one pass

Decision:

- reject

### Approach C. Boundary-first, phased hardening for both API and modules

Pros:

- aligns with current repo progress
- keeps Inertia stable
- reduces risk incrementally
- prepares clean NestJS migration seam

Cons:

- temporary mixed state remains during rollout

Decision:

- recommended

## Recommended Design

Use Approach C.

### Phase 1. Freeze Drift

Objectives:

- no new legacy-only public endpoints
- no new cross-module internal imports in runtime code
- no new controller-local API contract drift

Actions:

- keep `/api/v1/*` as required canonical namespace
- extend module-boundary guard from `domain/*` only to broader cross-module internal import policy
- preserve allowlist only for proven transitional cases

### Phase 2. Harden Shared HTTP Boundary

Objectives:

- one transport policy
- one auth-contract policy
- one response/error direction per transport class

Actions:

- continue routing middleware/exception logic through transport metadata
- reduce URL sniffing
- centralize compatibility alias policy
- keep explicit auth-only route groups outside `requireOrg()` middleware
- shrink `OrganizationResolverMiddleware` from broad fallback toward declared route scope

### Phase 3. Harden Module Seams

Objectives:

- inter-module orchestration via port/facade/event seams
- fewer direct cross-module infra dependencies

Actions:

- identify highest-value runtime violations
- introduce consumer-owned ports
- move provider adapters to runtime composition layer
- keep `public_contracts/*` thin
- remove cross-module imports into provider `infra/*`, `actions/*`, and `support/*` first

Priority families:

- `users` consuming `reviews`, `organizations`, `skills`
- `projects` consuming `organizations`, `skills`, `tasks`
- `tasks` consuming `projects`, `notifications`, `audit`, `reviews`

### Phase 4. Canonicalize Reference API Families

Objectives:

- turn a few route families into model implementations

Candidate families:

- me/settings/notifications/profile snapshots
- task statuses/workflow
- projects/organizations read-write parity

### Phase 5. Retire Drift Gradually

Objectives:

- shrink compat surface
- shrink route fallback logic
- shrink transitional allowlists

## Guardrails Required

### 1. API Guardrails

Keep and evolve:

- `check:api:route-governance`
- `check:api:route-matrix`
- `check:api:deprecation-policy`
- `check:api:transport-binding`
- `check:api:auth-contracts`
- `check:api:response-boundary`
- `check:http:org-context-seam`

### 2. Module Guardrails

Replace current narrow `module-domain-boundary` rule with broader runtime rule:

- runtime code under `app/modules` and `start`
- allow same-module internals
- allow cross-module `public_contracts/*`
- allow cross-module provider entrypoints explicitly declared as stable seams if needed
- block cross-module:
  - `actions/*`
  - `controllers/*`
  - `infra/*`
  - `domain/*`
  - `support/*`

Transitional note:

- tests may need separate policy from runtime
- runtime guard must be strict first
- test guard can tighten later in dedicated pass

### 3. Documentation Guardrails

Required docs must stay aligned:

- `docs/API_STANDARD.md`
- `docs/api-standardization-audit-2026-07-06.md`
- `docs/api-migration-roadmap-2026-07-06.md`

Need explicit section:

- module-to-module communication is port-first, not HTTP-first
- auth-only routes are not implicitly organization-scoped
- compat alias routes cannot diverge in auth/context semantics from canonical routes

## Invariants

After implementation work based on this design:

1. Inertia pages still render and redirect as before.
2. Canonical public API remains `/api/v1/*`.
3. Legacy `/api/*` business routes remain compatibility aliases only.
4. Admin/internal/testing/callback surfaces remain separated from public business API classification.
5. Runtime code cannot add new cross-module internal imports without failing guardrails.
6. Cross-module backend communication direction favors ports/contracts, not HTTP self-calls.
7. Future NestJS migration can map:
   - route binding -> controller metadata
   - auth contracts -> guards
   - response/error boundary -> interceptors/filters
   - module ports -> providers/interfaces
8. Auth-only APIs such as `me`, `settings`, and `notifications` remain usable without ambient organization context.
9. `me`-scoped review APIs do not inherit org-only authorization rules.

## Initial Execution Order

1. Update standards docs to encode module-boundary rule explicitly.
2. Replace `check_module_domain_boundary.mjs` with broader runtime module-boundary guard.
3. Run guard and inventory violations.
4. Fix highest-value runtime violations first or add narrow temporary allowlist with expiry note.
5. Continue API family standardization on top of stricter module seam.

## Risks

### Risk 1. Over-tight guard breaks too much code at once

Mitigation:

- scope first to runtime files
- add explicit temporary allowlist only where necessary
- remove allowlist incrementally

### Risk 2. `public_contracts/*` becomes bypass tunnel

Mitigation:

- document thin-contract rule
- review new additions carefully
- forbid broad helper schema evidenceing

### Risk 3. Inertia regressions from over-eager API unification

Mitigation:

- keep page routes separate
- do not force page flows through HTTP API layer
- use contract/integration tests for changed families

### Risk 4. Organization resolver fallback keeps reintroducing hidden coupling

Mitigation:

- prefer explicit route metadata over path-prefix inference
- maintain small audited exemption list during transition only
- add contract tests for auth-only families that historically regressed:
  - `me`
  - `settings`
  - `notifications`
  - `me/reverse-reviews`

## Self-Review

### Placeholder Scan

No `TODO`, `TBD`, or unresolved placeholders intentionally left in this spec.

### Internal Consistency

This design keeps:

- public API canonicalization under `/api/v1/*`
- legacy `/api/*` as aliases
- admin/ops/callback surfaces separate
- module seams via ports/contracts, not HTTP
- auth-only seam separate from org-scoped seam

These points are consistent across all sections.

### Scope Check

Scope is still large, but implementable as one program with phased plans because API boundary and module boundary are coupled migration seams, not unrelated subsystems.

### Ambiguity Check

Explicit working decision used by this spec:

- `public business API` is the canonical industrial contract target
- `admin/internal/testing/callback` surfaces are governed separately, not folded into the same public contract
- cross-module communication inside backend must prefer ports/contracts, not internal HTTP calls

## Review Gate

Please review this spec before implementation planning:

- `docs/superpowers/specs/2026-07-07-api-and-module-boundary-design.md`

If approved, next step is a concrete implementation plan for guardrails, docs alignment, and the first safe refactor phase.
