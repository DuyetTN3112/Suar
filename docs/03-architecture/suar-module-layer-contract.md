# Suar Module And Layer Architecture Contract

| Field                  | Value                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Status                 | Normative target                                                                                              |
| Scope                  | Backend code under `app/modules/*`, `app/infra/*`, `app/composition/*`, `start/*`, and `commands/*`           |
| Architecture style     | Modular monolith, use-case/CQRS application layer, Ports and Adapters at external and module boundaries       |
| Application layer name | `actions`                                                                                                     |
| Primary optimization   | Minimize coupling between feature modules, even when this requires small boundary-local duplication           |
| Owner                  | Engineering                                                                                                   |
| Review trigger         | Any new top-level module folder, public runtime capability, port, adapter, worker, or cross-module dependency |
| Evidence ledger        | `module-layer-boundary-audit-2026-07-23.md`                                                                   |
| Accepted decision      | `application-boundary.md`                                                                                     |

## 1. Purpose

This file is the canonical placement and dependency contract for Suar.

It answers:

1. what each layer owns;
2. what each layer may import;
3. where ports and adapters live;
4. how modules communicate;
5. how controller request/response mapping differs from port direction;
6. how CQRS in actions relates to CQRS in repositories;
7. where services, support helpers, workers, and composition belong;
8. what continuous architecture verification must prove.

The audit ledger records evidence and tracked debt. This file defines the canonical contract. When
another document conflicts with this contract, this contract wins unless an approved architecture
decision explicitly replaces it.

## 2. Core Decisions

### 2.1 `actions` is the application layer

Suar does not use `application/use_cases` as the use-case implementation folder.

The canonical application layer is:

```text
actions/
  commands/
    internal/
  queries/
  dtos/
  mappers/
  ports/
    inbound/
    outbound/
```

Rules:

- a command represents an intent that may change business state;
- a query returns information and must not change business state;
- commands and queries are the primary orchestration units;
- every externally driven business intent terminates at one command or query; a controller,
  listener, job, CLI command, or outer adapter must not reconstruct the workflow by calling
  application services and outbound ports itself;
- domain rules do not move into commands merely because a command invokes them;
- a narrow collaborator genuinely shared by commands and queries is a precisely named file at the
  `actions/` root; no generic collaborator subfolder is created for it;
- a command-only reusable sub-operation lives under `actions/commands/internal`; a query-only
  reusable sub-operation lives under `actions/queries/internal`;
- an internal application collaborator is called by commands/queries, does not call or construct
  them, does not expose a complete user intent, and is not injected into a controller;
- `actions/support` and other owner-layer `support` folders contain only synchronous,
  side-effect-free helpers; a helper that performs I/O or coordinates ports is not support;
- command/query factories and executable capability facades are composition concerns, not
  application services;
- `application/` is transitional and must be retired after its live contracts are moved into the
  canonical `actions` structure.

Guarded baseline: production has zero `services`, `support`, `serializers`, `builders`, `utils`,
or `actions/factories` folders/files. The placement guard rejects any new generic `services`
folder rather than growing a reviewed-exception allowlist.

The `actions/` root is closed, not a replacement bucket. Besides module-local CQRS primitives
(`BaseCommand`, `BaseQuery`, interfaces, result, and action context), the guarded inventory is
exactly three Tasks collaborators: application-review access, completion-package access, and
permission-context hydration. Any fourth file fails the placement gate until it is assigned to a
command/query family, domain policy, port, mapper, adapter, repository, or an explicit contract
amendment.

### 2.2 Module isolation is more important than eliminating small duplication

Allowed duplication:

- small consumer-owned input/output shapes;
- small mapper functions;
- module-local `BaseCommand`, `BaseQuery`, and result helpers;
- small protocol-neutral value shapes that prevent an unstable provider dependency.

Forbidden duplication:

- business rules and permission decisions;
- lifecycle semantics;
- event protocol values;
- persistence behavior or cross-owner SQL;
- large mappings whose meaning is owned by another module;
- domain formulas whose independent copies could diverge.

### 2.3 Dependency direction

The high-level direction is:

```text
route / middleware / controller / listener / CLI / job
                    |
                    v
             inbound application port
                    |
                    v
                 command / query
                    |
             +------+------+
             |             |
             v             v
   domain/collaborator  outbound port
                           |
                           v
                  repository / adapter
                           |
                           v
                 DB / cache / API / module
```

The domain layer never depends on controllers, actions, infrastructure, bootstrap, or
composition.

## 3. Ports And Adapters

### 3.1 Port definition

A port is a stable, technology-neutral application boundary used where Suar needs dependency
inversion, substitution, isolation, or an intentionally supported capability.

Not every interface is a port. Not every call between layers needs a port.

Create a port when at least one condition applies:

- a feature module needs a capability owned by another module;
- an action needs an external system;
- an action needs persistence/cache/event publication isolated from technology;
- multiple inbound drivers need the same use case;
- tests need to replace a dependency whose behavior is material to the use case;
- a runtime implementation may change independently of the consumer.

Do not create a port merely to wrap:

- a pure domain policy;
- a local mapper;
- a DTO constructor;
- a one-line same-layer helper;
- another port with the same responsibility.

### 3.2 Inbound ports

Inbound ports describe capabilities the module offers to driving actors.

Driving actors include:

- HTTP controllers;
- event listeners;
- CLI commands;
- scheduled jobs;
- tests;
- outer composition acting on behalf of another module.

Commands and queries are the default inbound capability. Add an explicit contract under
`actions/ports/inbound` only when a stable interface or dependency-injection token is useful.

An inbound port:

- uses application-owned inputs and outputs;
- contains no Adonis `HttpContext`;
- contains no Lucid model or transaction type;
- exposes business intent, not transport verbs;
- does not construct its implementation.

### 3.3 Outbound ports

Outbound ports describe capabilities the application needs from secondary actors.

Examples:

- command and query repositories;
- unit-of-work and opaque transaction runners;
- cache and lock access;
- clock and ID generation;
- event and outbox publication;
- notification staging;
- Clawagent/AI arbitration;
- another feature module's projection or behavior.

Outbound ports live under `actions/ports/outbound`.

Rules:

- the consumer owns the port;
- the port uses consumer-owned shapes;
- implementations never live in a port folder;
- a port must not import an implementation;
- a port must not expose Lucid, Redis, HTTP, Elasticsearch, or provider SDK types;
- one port should describe one coherent capability, not a service-locator bundle of unrelated
  dependencies.

A unit-of-work port expresses the atomic persistence capabilities required by one coherent
mutation. The command controls which operations occur, their ordering, policy decisions,
rollback semantics, and result. The infrastructure adapter opens the concrete transaction and
owns SQL, Lucid repositories/models, audit persistence, outbox persistence, and technology
conversion. A query may use a read transaction only for a consistent snapshot and never writes
through it. Application ports may pass an opaque transaction handle between outbound ports, but
must never expose a Lucid transaction type.

### 3.4 Adapter direction

Adapter direction is relative to the module boundary, not to whether a value is called a request
or response.

Inbound adapters:

- controllers;
- listeners;
- CLI command classes;
- scheduled-job entry points;
- callback/webhook controllers.

Outbound adapters:

- `infra/repositories`;
- `infra/adapters`;
- cache/search/message implementations;
- HTTP clients such as a Clawagent adapter;
- `app/composition/adapters` that bridge a consumer port to another module.

Existing role-specific folders remain preferable to a generic top-level `adapters` bucket.
Feature event inbound adapters live at the module-root `listeners/` folder, never nested under
the application/use-case layer. Application-wide emitter registration and listener dependency
wiring live in `app/composition/*listener_composition.ts` or an equivalent outer-composition
file.

The repository-root `commands/` folder is an Adonis Ace autoload root, not a generic CLI support
layer. Every TypeScript file below it must be a top-level Ace command module that default-exports
its `BaseCommand` subclass. Shared pure CLI mapping/formatting belongs to a precise feature-owned
inbound-adapter mapper; do not create `commands/support` or another nested helper folder.

## 4. Controller Contract

Controllers are thin inbound transport adapters.

The canonical flow is:

```text
HTTP request
  -> request mapper
  -> controller
  -> one command/query/inbound capability
  -> response mapper
  -> HTTP or Inertia response
```

The word `one` applies per endpoint method and business intent. A controller class may expose
several endpoint methods, but each method delegates its workflow to exactly one command, query, or
explicit inbound port. It may additionally invoke pure request/response mapping and transport
response functions.

A controller may receive an inbound command/query factory contract when request-scoped context
makes direct handler injection impractical. That factory is implemented and wired in outer
composition. The controller may select one command/query from it and invoke that one use case; it
must not supply outbound dependencies, combine several handlers, or reconstruct the object graph.

An Adonis controller that uses constructor injection must apply the `@inject()` decorator to the
class. Calling `inject()(ControllerClass)` after the class declaration is forbidden because
TypeScript has already compiled the class and does not emit the constructor parameter metadata
that Fold needs to resolve it.

A controller must not:

- inject or import action-root or `actions/commands|queries/internal` collaborators;
- inject or import `actions/ports/outbound`;
- construct a command/query or its dependency graph;
- call persistence, cache, event, audit, cross-module, or authorization ports around a use-case
  invocation;
- split one business workflow between the controller and a command/query.

### 4.1 Request mappers

`controllers/mappers/request` owns:

- alias/casing normalization;
- route/query/body extraction;
- transport-level parsing;
- validation-schema invocation;
- conversion into an action DTO/input.

It does not own:

- authorization decisions;
- cross-module reads;
- database access;
- domain invariants;
- workflow orchestration.

### 4.2 Response mappers

`controllers/mappers/response` owns:

- JSON envelope and HTTP presentation shape;
- snake/camel conversion at the transport boundary;
- Inertia page props;
- model-to-transport serialization during migration.

It does not own:

- business calculations;
- permission decisions;
- persistence reads;
- cross-module enrichment.

Request and response mappers are two transformations inside the same inbound HTTP adapter. A
response mapper is not a Hexagonal outbound adapter.

### 4.3 Controller module boundaries

A feature controller must not call another feature module directly.

When a page needs several modules:

1. define one page query or inbound capability;
2. let that use case own consumer ports;
3. implement the ports in outer composition;
4. inject the capability into the controller.

Controller-to-controller calls and backend-to-local-HTTP calls are forbidden.

## 5. CQRS Contract

Suar applies CQRS at two levels.

| Level       | Command/write side         | Query/read side           |
| ----------- | -------------------------- | ------------------------- |
| Application | `actions/commands`         | `actions/queries`         |
| Persistence | `infra/repositories/write` | `infra/repositories/read` |

### 5.1 Command rules

A command:

- represents business intent;
- may read state needed to validate an invariant;
- owns the atomic scope and rollback semantics for its business operation;
- invokes a technology-neutral unit-of-work/transaction-runner port when several writes, locks,
  audit rows, or outbox rows must commit together;
- controls policy, validation, operation ordering, domain transitions, event payload decisions,
  post-commit decisions, and the final result;
- does not import Lucid/database services, concrete repositories, cache adapters, or other
  infrastructure merely to implement that atomic scope;
- writes through outbound ports implemented by infrastructure adapters;
- may read a projection after commit when the response requires it;
- stages durable side effects inside the transaction and dispatches non-transactional effects
  after commit.

### 5.2 Query rules

A query:

- does not mutate business state;
- returns a consumer/presentation-oriented projection;
- may use a specialized read-model port whose infrastructure adapter owns SQL/repository/cache
  technology;
- may use cache through an outbound port as a transparent technical optimization;
- owns filtering, authorization, projection selection, and read-workflow orchestration;
- does not load an aggregate merely to serialize an ORM graph;
- does not call a write repository.

### 5.3 Repository rules

`infra/repositories/read` contains:

- query objects;
- projections;
- bulk fact readers;
- read-model hydration;
- pagination and filtering.

`infra/repositories/write` contains:

- mutations;
- aggregate locks;
- transactional persistence;
- idempotency/fencing state;
- outbox staging.

A root repository file is allowed only when it is a real aggregate repository with a clear
domain contract. Compatibility barrels that merge read and write APIs must be retired.

Domain repository interfaces are retained only when a live aggregate/use case consumes them.
An interface plus implementation with no live application consumer is migration debt, not proof
of a completed DDD repository pattern.

## 6. Cross-Module Communication

### 6.1 Synchronous communication

Canonical flow:

```text
Module A command/query
  -> Module A outbound port
  -> app/composition adapter
  -> Module B command/query or deliberately supported capability
```

Rules:

- Module A never imports Module B `actions`, `domain`, `infra`, `services`, `support`,
  `bootstrap`, or controllers;
- the outer adapter may know both sides;
- an outer adapter calls a provider use case when business semantics are involved;
- an outer adapter may call a provider read projection only when the provider explicitly owns
  and tests that projection;
- moving provider SQL into the consumer is forbidden;
- a provider-owned runtime facade is an exception, not the default integration style.

### 6.2 Asynchronous communication

Canonical flow:

```text
Module A command
  -> A-owned event/outbox publisher port
  -> transactional outbox
  -> versioned provider-owned event/fact
  -> Module B listener
  -> Module B command
```

Published events and facts belong in provider `public_contracts`.

Listeners are inbound adapters and must delegate to local actions. They do not become generic
multi-feature orchestration services.

The canonical placement is:

```text
app/modules/<module>/listeners/<event>_listener.ts
app/composition/<module>_listener_composition.ts
```

Historical listener references nested below an action/application folder are invalid and must be
updated rather than preserved as compatibility paths.

## 7. `public_contracts`

`public_contracts` is a provider-owned stable data/protocol surface.

Allowed:

- immutable DTOs and result shapes;
- stable constants/enums;
- versioned events and facts;
- pure schemas for published protocols;
- technology-neutral capability contracts when direct provider support is explicitly chosen.
- reviewed platform capability proxies for Logger, Cache, and Audit when they depend only on the
  public contract, require explicit boot-time provider registration, and have no concrete default.

Forbidden:

- importing or re-exporting actions, infrastructure, bootstrap, support, or top-level services;
- exporting Lucid models or transaction clients;
- import-time construction of a concrete implementation;
- self-configuring service location or a hidden default implementation;
- broad `*_public_api` barrels that expose provider internals;
- moving helpers here solely to satisfy an import guard.

Feature-to-feature executable behavior uses a consumer-owned port by default. Pure shared
kernels such as error values, pagination primitives, and versioned event facts may be imported
directly.

A reviewed platform proxy is not a feature facade. It must expose one narrow capability, reject
missing or conflicting registration with a typed invariant failure, and receive its implementation
from bootstrap or `app/composition`. It must not import framework, ORM, Redis, or feature
implementation code. New platform proxies require an architecture review and a public-surface
guard test.

## 8. `bootstrap` And `app/composition`

### 8.1 Module bootstrap

`bootstrap` may:

- construct commands, queries, and application services;
- bind ports to adapters;
- expose factories to an outer composition root;
- register runtime workers during startup.

It must not:

- contain SQL;
- decide permissions or lifecycle rules;
- parse HTTP input;
- be imported by domain or actions;
- mutate global configuration merely because a public contract was imported.

### 8.2 Outer composition

`app/composition` is the only application-wide layer allowed to know multiple feature
implementations.

It owns:

- container providers;
- cross-module adapters;
- factories combining feature ports;
- startup lifecycle wiring.

It does not own business rules.

### 8.3 Shared platform infrastructure

`app/infra` contains only application-wide technology clients that are legitimately shared by
multiple feature modules, such as the configured Elasticsearch SDK client.

It may contain:

- concrete provider or framework client construction;
- technology-specific connection and transport configuration;
- provider-neutral lifecycle needed by the shared client itself.

It must not contain:

- feature business policy or lifecycle decisions;
- feature document mappings or projection rules;
- feature repositories or persistence ownership;
- module facades, public contracts, or cross-feature orchestration;
- imports from `app/modules/*`, including otherwise public feature contracts.

Feature-owned adapters and repositories remain inside the owning module's `infra` layer. Platform
infrastructure may depend on application configuration and provider/framework packages, but its
dependency direction never points back into a feature module.

## 9. Precise Behavior Placement

The word `service` alone does not define a layer. A service never gains permission to own an
end-to-end workflow merely because its caller is a command/query.

| Role                                        | Canonical placement              |
| ------------------------------------------- | -------------------------------- |
| One user/business intent                    | command or query                 |
| Collaborator shared by Commands and Queries | precise named file at `actions/` |
| Command-only reusable sub-operation         | `actions/commands/internal`      |
| Query-only reusable sub-operation           | `actions/queries/internal`       |
| Pure business calculation/policy            | a named file under `domain`      |
| External API/SDK integration                | `infra/adapters`                 |
| Persistence technology                      | `infra/repositories`             |
| Runtime worker/replay/retention             | `infra/workers` or `jobs`        |
| Projection consumer                         | `infra/projections`              |
| Object graph/configuration                  | `bootstrap` or `app/composition` |

Production code may not create a `services/` folder at any layer. Reuse alone does not define
ownership: place behavior by what it does and which use-case family may invoke it.

### 9.1 Internal collaborator test

An internal action collaborator is allowed only when every statement is true:

1. at least two production commands/queries reuse the behavior; a one-use-case helper stays local
   to that use case or moves to its actual mapper, policy, port, or adapter role;
2. the caller command/query remains visibly responsible for ordering, transaction boundary,
   success/failure semantics, and the final result;
3. the collaborator does not import, create, execute, or return a command/query;
4. controllers, listeners, routes, jobs, CLI drivers, and outer feature adapters do not call it as
   the module's executable entry point;
5. it depends only on domain policy, application DTOs, and technology-neutral outbound ports;
6. its location states the owner (action root, `commands/internal`, or `queries/internal`) and its
   symbol names state the operation (`*Resolver`, `*Hydrator`, `*Stager`, `*Settler`).

An action-root collaborator is additionally narrow and non-orchestrating. Authorization access
files there may resolve facts and assemble inputs for domain policies, but may not mutate state,
own a transaction, stage effects, or become a complete use case.

A production file or declaration may not use the generic suffix `_service`, `_support`,
`*Service`, or `*Support` to avoid choosing a role. This applies in every layer, including
infrastructure: implementations use names such as `*Adapter`, `*Repository`, `*Store`, `*Sink`,
`*Executor`, or `*Reader`. The security term `ServicePrincipal` is not an application service and
is exempt when it denotes a non-human runtime identity rather than executable behavior.

A post-commit settler is justified only when commands have already selected the independent
effects and remain visibly responsible for the commit boundary, invocation point, and returned
business result. The settler may execute those already-decided effects and report failures; it
must not decide which business effects exist, change committed state, retry a workflow, or turn
failure containment into a second use case. Common command mechanics that are shared by every
command in one module may instead live as protected behavior on that module's `BaseCommand`.

If the behavior represents a complete read, it is a query. If it represents a complete mutation,
it is a command. If it constructs commands/queries, it belongs in module bootstrap or outer
composition. If it exposes a stable driving contract, define that contract under
`actions/ports/inbound` and bind the command/query implementation from composition.

Generic `actions/facades` and `actions/factories` folders are forbidden. A page/composite
command or query may visibly coordinate subordinate use cases, but helpers, builders, services,
facades, and mappers outside an owning command/query may not instantiate or execute a
command/query. Context-bound construction belongs to bootstrap/composition; pure value
construction belongs to a named mapper or builder.

### 9.2 Factory terminology

Two similarly named roles must not be confused:

- `actions/ports/inbound/*Factory` is a driving contract/runtime injection token. It declares
  which context-bound Command or Query a controller may request. It contains no construction,
  infrastructure dependency, or business workflow.
- `app/composition/factories/*` is the concrete object-graph implementation. It may instantiate a
  Command/Query and supply repositories/adapters. Construction is synchronous; the factory must
  not call `.handle()`/`.execute()`, await I/O, decide business ordering, open transactions, or
  transform the result.

Controllers depend on the inbound contract; composition registers the concrete implementation.
There is no production `actions/factories` folder. Large composition factories should be split by
bounded use-case family for maintainability, but their architectural owner remains composition.

## 10. `support`

`support` is not an architectural layer.

A local `support` subfolder is allowed only under an explicit owner layer:

- `controllers/support`;
- `actions/support`;
- `infra/.../support`;
- `tests/.../support`.

Rules:

- no top-level module `support`;
- do not create a `support` folder when a precise existing role applies: request/response and
  projection transformations go to `mappers`, validation goes to `validators`/rules, business
  decisions go to domain policy, and runtime/persistence integrity belongs to an adapter;
- lower layers never import controller support;
- support is synchronous and side-effect-free: it may normalize, validate, map, format, or build
  an already-owned value;
- support does not call outbound ports, application services, commands, queries, persistence,
  cache, network, event, audit, or transaction capabilities;
- a support file containing asynchronous work, a complete workflow, business decisions,
  authorization, cross-module enrichment, or persistence orchestration must be renamed and moved
  to its actual role;
- size alone does not prove misplacement, but files above roughly 150 lines require a placement
  review.

The production baseline contains no `support` folders. A new support file therefore fails
the placement gate until its owner, purity, consumers, and lack of a more precise canonical role
are explicitly reviewed.

## 11. Domain, Observability, Events, And Platform Concerns

### 11.1 Domain

Domain owns:

- entities and value objects;
- state transitions;
- invariants;
- permission and eligibility policies;
- business formulas;
- domain events.

Domain is framework- and persistence-independent.

### 11.2 Observability

Feature `observability` owns pure feature event factories and safe telemetry projection.

The central observability module separates:

- public event/trace contracts;
- application-facing sink ports;
- concrete logger/audit adapters;
- composition.

Feature modules never import a concrete observability singleton through a public barrel.
Telemetry failures must not change business semantics.

### 11.3 Events and outbox

Internal domain events may remain module-local. Cross-module events are versioned published
contracts. Durable cross-module side effects use an outbox, idempotent consumers, retry, and
dead-letter handling where loss would violate business behavior.

### 11.4 Audit evidence, activity timelines, and telemetry

These are separate capabilities even when all three contain `user_id`, an event name, and a
timestamp:

- immutable security/operational evidence belongs to Audit (or another explicitly named
  accountability capability) with its own retention and access policy;
- a user-facing activity timeline is a consumer projection exposed through an owning Query and
  reader port; the profile/User module may own that presentation use case without owning the raw
  producer log;
- behavioral telemetry belongs to Observability/analytics and requires explicit collection,
  privacy, retention, and aggregation rules.

A table named `user_activity_events` or a generic `action_type`/JSON schema does not establish a
bounded context. Do not move cross-feature logs into Users merely because rows contain a
`user_id`, and do not interpret “user activity” as permission to capture every action. A separate
activity module requires live producers and consumers, an allow-listed event taxonomy,
visibility/redaction policy, retention/deletion rules, and idempotent projection semantics.

Decision: Audit is the canonical login/logout evidence and personal-history source.
`audit_events.occurred_at` is the database-assigned monotonic record/hash-chain order;
`source_occurred_at` is a separate nullable producer-observed timestamp and is sealed by
schema-v3 event hashes. The former generic activity table is a read-only retired archive, not a
runtime module, User aggregate, or allowed write target.

## 12. Base Classes And Shared Code

Module-local `BaseCommand`, `BaseQuery`, result types, and action contexts may remain duplicated.
They must not be centralized merely to remove repeated lines.

Target improvements:

- inject a transaction runner instead of importing Lucid in every base command;
- inject or pass a query cache capability instead of importing a global cache singleton;
- keep module-specific action context types;
- do not create a feature-to-feature shared base-class dependency.

## 13. Persistence Ownership And Hidden Coupling

Import guards cannot detect raw SQL that reads or writes another module's tables.

Rules:

- cross-owner writes are forbidden;
- cross-owner reads require an explicitly reviewed projection seam;
- consumers do not duplicate provider deletion, visibility, privacy, or lifecycle predicates;
- direct SQL does not count as decoupling merely because it removes a TypeScript import;
- provider facts should be bulk-oriented to avoid N+1 calls;
- persistence relations between feature models require an explicit ownership decision and guard.

## 14. Folder Contract Summary

| Folder                     | Architectural role                              |
| -------------------------- | ----------------------------------------------- |
| `controllers`              | HTTP/Inertia inbound adapter                    |
| `middleware`               | HTTP transport/auth/context adapter             |
| `validators`               | Transport/input validation                      |
| module-root `listeners`    | Event inbound adapter                           |
| `actions/commands`         | Write-oriented use cases                        |
| `actions/queries`          | Read-oriented use cases                         |
| precise `actions/*.ts`     | Narrow collaborator shared across CQRS sides    |
| `actions/*/internal`       | Use-case-family-owned subordinate collaborators |
| `actions/ports/inbound`    | Explicit supported use-case contracts           |
| `actions/ports/outbound`   | Consumer-owned dependency contracts             |
| `domain`                   | Business model, policy, invariant               |
| `infra/repositories/read`  | Read/query persistence adapters                 |
| `infra/repositories/write` | Write/transaction persistence adapters          |
| `infra/adapters`           | External technology adapters                    |
| `infra/workers`            | Polling/retry/runtime workers                   |
| `observability`            | Feature telemetry factories                     |
| `public_contracts`         | Stable provider data/protocol surface           |
| `bootstrap`                | Module object graph                             |
| `app/infra`                | Shared technology clients only                  |
| `app/composition`          | Application-wide and cross-module object graph  |
| `tests`                    | Verification                                    |

Folders such as generic `application`, any `services`, top-level `support`, generic `types`, and
generic `adapters` are forbidden or transitional and must be reclassified by precise owner.

## 15. Refactor Order

The repository is migrated in dependency-safe order:

1. make architecture guards and this contract authoritative;
2. move concrete implementations out of port folders;
3. split concrete external clients from application workflows;
4. normalize ports under `actions/ports/inbound|outbound`;
5. remove executable feature behavior from impure public-contract barrels;
6. move controller cross-module orchestration into use cases and outer adapters;
7. move SQL and runtime work out of bootstrap;
8. remove controller dependencies on internal collaborators/outbound ports, move command/query
   factories to composition, and reclassify service/support workflows;
9. retire compatibility repository barrels;
10. integrate or remove disconnected DDD repository/entity migration slices;
11. eliminate hidden cross-owner SQL and persistence relations;
12. verify all architecture, type, test, and runtime gates.

## 16. Completion Gates

The architecture migration is complete only when all of the following are proven:

- no runtime cross-module import targets feature internals;
- no feature controller calls another feature module directly;
- no controller imports or injects internal action collaborators or `actions/ports/outbound`;
- no controller applies `inject()(ControllerClass)` after compilation; constructor-injected
  controllers use `@inject()`;
- every endpoint method delegates one business intent to one command/query/inbound port;
- every listener delegates one event intent to one local command/query/inbound port and never
  calls an outbound adapter/capability as its workflow;
- no application/domain code imports bootstrap or composition;
- every executable feature-to-feature dependency crosses a consumer-owned outbound port;
- implementations do not live in port folders;
- ports expose no framework, SDK, ORM, or Redis types;
- public contracts are pure, except explicitly reviewed technology-neutral capability
  interfaces;
- no public contract constructs or re-exports a concrete runtime service;
- bootstrap contains no SQL or business rule;
- no production `services` folder or generic top-level support bucket remains;
- authorization and command/query internal collaborators never construct, execute, or expose
  commands/queries as a facade;
- support files are pure synchronous helpers with no I/O or workflow orchestration;
- every composition factory performs synchronous construction only and never executes a use case;
- every file under the Ace `commands/` autoload root is a top-level default-exported
  `BaseCommand` subclass; helpers live in an owner-layer mapper or another precise feature role;
- every command/query has a clear persistence direction;
- compatibility read/write repository barrels are gone;
- disconnected repository/entity architecture strands are resolved;
- raw SQL ownership audit has no unreviewed cross-owner statement;
- architecture guards, typecheck, lint, build, and relevant unit/integration/contract suites
  pass;
- GitNexus change detection shows only expected symbols and flows for each migration slice.

Module-local `BaseCommand`, `BaseQuery`, result, and action-context duplication is deliberately
excluded from the debt count. Independence between feature modules takes priority over removing
that small repetition.

### 16.1 Enforced commands

CI must run every maintained backend architecture gate, not only the controller side-effect gate:

```text
pnpm run check:arch:backend:side-effects
pnpm run check:arch:backend:auth-layers
pnpm run check:arch:backend:module-layers
pnpm run check:arch:backend:module-domain-boundary
pnpm run check:arch:backend:port-taxonomy
pnpm run check:arch:backend:public-contract-surface
pnpm run check:arch:backend:exceptions
```

The Auth gate is the first same-module layer-direction ratchet. Equivalent repository-wide
coverage must replace feature-specific ratchets as the remaining same-module layer debt is
removed. Passing only the cross-module/public-surface gates is not proof that the migration is
complete.

## 17. New-Code Checklist

Before adding a file or folder:

1. Which module owns the behavior and data?
2. Is this transport, application, domain, infrastructure, or composition?
3. Who is the driving actor?
4. Is the dependency inbound or outbound relative to this module?
5. Does the consumer own the required interface?
6. Does the contract leak technology or provider internals?
7. Is a port materially useful, or merely ceremonial?
8. Is a generic bucket hiding a more precise role name?
9. Could the same goal be achieved with small consumer-owned data duplication?
10. Which guard and test prove the intended dependency direction?

If these questions cannot be answered, the new artifact is not ready to enter the codebase.

## 18. Test Datastore Safety

PostgreSQL, Redis, cache Redis, and Elasticsearch tests run only against explicitly selected test
data planes. `tests/helpers/test_datastore_guard.ts` is the fail-closed authority used by the
integration runner, application test bootstrap, factory cleanup, and Playwright server startup.
An integration or E2E run must fail before migration, build, index reset, or fixture cleanup when
any active datastore does not match its declared test target.

### 18.1 Local Elasticsearch services

The local search services are owned by
`/home/tranngocduyet/Scripts/laragon-linux/docker-compose.yml`:

| Purpose              | Endpoint                | Storage                                | Allowed index prefix                                        |
| -------------------- | ----------------------- | -------------------------------------- | ----------------------------------------------------------- |
| Development          | `http://127.0.0.1:9200` | persistent `elasticsearch_data` volume | `suar_`                                                     |
| Integration/E2E test | `http://127.0.0.1:9201` | disposable container `tmpfs`           | a prefix containing the token `test`, normally `suar_test_` |

Start and verify the two physically separate services:

```bash
cd /home/tranngocduyet/Scripts/laragon-linux
docker compose up -d elasticsearch elasticsearch-test kibana
docker compose ps elasticsearch elasticsearch-test
curl -fsS http://127.0.0.1:9200/_cluster/health
curl -fsS http://127.0.0.1:9201/_cluster/health
```

Use these test variables in the Suar `.env` or pass them explicitly to the command:

```dotenv
ELASTICSEARCH_TEST_ENABLED=true
ELASTICSEARCH_TEST_NODE=http://127.0.0.1:9201
ELASTICSEARCH_TEST_USERNAME=
ELASTICSEARCH_TEST_PASSWORD=
ELASTICSEARCH_TEST_INDEX_PREFIX=suar_test_
```

`applyTestDatastoreOverrides()` maps these values to the active `ELASTICSEARCH_*` configuration
before the application imports `config/search.ts`. The guard rejects:

- a missing or malformed `ELASTICSEARCH_TEST_NODE`;
- endpoint aliases that resolve to the development search process;
- an active endpoint that differs from the declared test endpoint;
- a prefix without an explicit `test` ownership token;
- wildcard, comma, whitespace, or other unsafe prefix characters.

### 18.2 Running tests

Unit tests disable Elasticsearch by default and must not require a running search service:

```bash
pnpm run test:unit
```

Integration tests require PostgreSQL test DB, both Redis test targets, and the Elasticsearch test
service. The safe entrypoint validates every target before migration, Vite build, application boot,
or an Elasticsearch `resetIndex()`:

```bash
pnpm run test:integration:safe
```

Playwright uses the same guard through `scripts/start_e2e_server.sh`:

```bash
pnpm run test:e2e
```

Search integration tests may create, reset, and delete only indices beginning with the active
`ELASTICSEARCH_TEST_INDEX_PREFIX`. Never point `ELASTICSEARCH_TEST_NODE` at port `9200`, and never
use `suar_` as a test prefix. `ALLOW_UNSAFE_TEST_DATASTORES=true` is an audited break-glass path,
requires `ALLOW_UNSAFE_TEST_DATASTORES_REASON`, and is not an acceptable normal test workflow.

To discard only the disposable local search test plane:

```bash
cd /home/tranngocduyet/Scripts/laragon-linux
docker compose rm -sf elasticsearch-test
docker compose up -d elasticsearch-test
```

This operation does not remove the persistent `elasticsearch_data` development volume.

### 18.3 Search quality and latency benchmark

The Search benchmark uses the production repository query implementations against the dedicated
Elasticsearch test plane. It creates only indices owned by a prefix containing separate `test`
and `benchmark` tokens, seeds a deterministic judged corpus, warms each query, and reports:

- Precision@K and Recall@K;
- Mean Reciprocal Rank (MRR@K);
- normalized Discounted Cumulative Gain (nDCG@K);
- nearest-rank p50, p95, and p99 latency for serial and concurrent query runs.

Run the standard local profile:

```bash
ELASTICSEARCH_TEST_ENABLED=true \
ELASTICSEARCH_TEST_NODE=http://127.0.0.1:9201 \
ELASTICSEARCH_TEST_INDEX_PREFIX=suar_test_benchmark_ \
SEARCH_BENCHMARK_ENFORCE=false \
pnpm run benchmark:search
```

Set `SEARCH_BENCHMARK_ENFORCE=true` in a controlled CI performance job to fail when any configured
quality or latency threshold is missed. Do not enable enforcement on a shared or resource-starved
runner without first recording a stable baseline.

The benchmark calls the full datastore guard before importing application repositories. It refuses
the development endpoint, a non-test prefix, or a prefix without the `benchmark` ownership token.
Its synthetic local result is regression evidence only: it is not a production SLO, throughput
claim, capacity test, or substitute for anonymized production query judgments.

### 18.4 Search index lifecycle administration test

The Search lifecycle integration test proves retention cleanup and rollback against the real
dedicated Elasticsearch test process. It creates a uniquely prefixed stable alias, three owned
physical generations, and documents with different counts. The test then verifies:

- dry-run selects only an expired alias-free generation outside the retention window;
- apply deletes only that exact physical index;
- the retained retired generation remains available for rollback;
- rollback requires exact current-index fencing and atomically moves the stable alias;
- the former active generation remains intact after rollback.

Run only through the guarded integration entrypoint:

```bash
ELASTICSEARCH_TEST_ENABLED=true \
ELASTICSEARCH_TEST_NODE=http://127.0.0.1:9201 \
ELASTICSEARCH_TEST_INDEX_PREFIX=suar_test_search_admin_ \
node --import=@poppinss/ts-exec bin/test.ts integration \
  --files app/modules/search/tests/backend/integration/search_index_administration.spec.ts
```

The test cleanup calls the same strict ownership predicate as production lifecycle code. It cannot
delete a development index or a physical index outside its unique `test`-owned alias family.
