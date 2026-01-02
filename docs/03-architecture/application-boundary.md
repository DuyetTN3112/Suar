# Application Boundary

| Field           | Value                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Status          | Accepted and implemented                                                                       |
| Scope           | Controllers, listeners, actions, collaborators, ports, composition factories, Audit           |
| Decision owner  | Engineering                                                                                    |
| Normative rules | [Suar Module And Layer Architecture Contract](./suar-module-layer-contract.md)                 |
| Evidence ledger | [Module Layer And Boundary Audit](./module-layer-boundary-audit-2026-07-23.md)                 |
| Diagram set     | [Architecture Diagram Catalog](./architecture-diagram-catalog.md)                              |

## Canonical Model

Suar keeps `actions` as its application layer. One Command or Query owns each complete externally
driven business intent.

```text
route / event / CLI
        |
        v
controller / listener / command driver
        |
        v
one Command or Query  <---- constructed by composition
        |
   +----+------------------+
   |                       |
   v                       v
domain policy       outbound capability
                           |
                           v
                    repository / adapter
```

The ownership rules are:

1. Controllers and listeners adapt inbound transport only. Each endpoint or event handler
   delegates one intent to one Command, Query, or explicit inbound capability.
2. Commands and Queries own authorization input, ordering, transaction intent, subordinate
   use-case invocation, side-effect decisions, failure semantics, and final result.
3. Domain code owns business decisions, invariants, formulas, and state-transition rules.
4. `actions/services` is exceptional. A service is allowed only for a narrow sub-operation reused
   by at least two Commands or Queries. It never owns a complete intent or executes another use
   case.
5. `support`, `utils`, `builders`, and `serializers` are not architecture layers. Code belongs to
   a named mapper, validator, domain policy, Command or Query, port, repository, adapter, or
   composition owner.
6. An `actions/ports/inbound/*Factory` is a driving contract and injection token. Its concrete
   implementation belongs to `app/composition/factories`; it constructs but never executes a
   Command or Query.
7. Cross-module behavior crosses a consumer-owned outbound port. Provider public contracts expose
   only deliberately stable facts, events, protocol values, or pure capabilities.

## Guarded Baseline

| Guarded inventory                                                     | Baseline |
| --------------------------------------------------------------------- | -------: |
| Production `actions/services` collaborators                           |        5 |
| Production module files under generic `support` directories          |        0 |
| Production module files under `serializers`, `builders`, or `utils`   |        0 |
| Production `actions/factories` files                                  |        0 |
| Composition factories restricted to synchronous construction          |       35 |
| Ace command files accepted by the autoload guard                      |       30 |
| Post-class `inject()(ControllerClass)` patterns                       |        0 |
| Runtime `user_activity` writers or bounded-context module             |        0 |
| Tracked runtime/public-surface/module-placement architecture findings |        0 |

The five Tasks application collaborators satisfy the service necessity test: reuse by multiple
use cases, narrow responsibility, and no ownership of a complete Command or Query workflow.

## Reference Slices

### Project access

`GetUserProjectAccessQuery` owns the complete access read: project lookup, organization-scope
validation, actor-role resolution, and policy decision. A composition factory constructs it;
callers invoke the Query rather than a service-led workflow.

### Task completion

When a status transition enters DONE, the parent status Command invokes
`CompleteTaskAssignmentsCommand` inside the caller-owned transaction. The subordinate Command
owns this ordered workflow:

1. complete active assignments;
2. ensure the review workflow;
3. stage one typed durable event per completed assignment.

The event writer persists an already-decided event through an outbound capability. It does not
decide the workflow.

### Auth evidence

`ProcessAuthSessionObservedCommand` owns the idempotent receipt and canonical Audit transaction.
Audit stores database record order in `occurred_at` and producer-observed time separately in
`source_occurred_at`, sealed by schema-v3 hashes. Personal activity views are policy-governed
projections over canonical facts; generic activity tracking is not an application boundary.

### Review construction

`ComposedReviewActionFactory` implements the inbound factory contract and delegates construction
to five bounded family factories. The composition layer owns dependency graphs; Commands and
Queries own execution.

### Personal work surface

`GET /work` is the authenticated user's cross-organization assigned-work list. It is not an
Organization task board or an activity feed. `ListMyWorkController` delegates this read to
`GetUserTasksQuery` through constructor injection.

## Consequences

- The executable entry point of a use case is identifiable from its name and location.
- Controller and listener behavior is predictable.
- Cross-module dependencies have one direction.
- Transaction and side-effect ordering are visible in Commands.
- Composition can grow without becoming a runtime service locator.
- Small boundary shapes and module-local base classes may be duplicated intentionally.
- Context-bound use cases require inbound factory contracts and outer wiring.
- Large composition graphs require family-level splitting and construction tests.
- Architecture exceptions require an explicit placement review.

## Non-Goals

This boundary does not:

- turn the modular monolith into microservices;
- require every pure helper to become a class or port;
- move business rules from Domain into Commands;
- make every cross-module read asynchronous;
- treat Audit, telemetry, notifications, and a personal activity projection as the same concern.

## Verification

The maintained architecture gates prove the boundary continuously:

```text
pnpm run check:arch:backend:side-effects
pnpm run check:arch:backend:auth-layers
pnpm run check:arch:backend:module-layers
pnpm run check:arch:backend:module-domain-boundary
pnpm run check:arch:backend:port-taxonomy
pnpm run check:arch:backend:public-contract-surface
pnpm run check:arch:backend:exceptions
```

Read the visual chain in this order:

1. [`arch_02_layer`](../11-diagrams/Architecture/01-system-architecture/high-level/arch_02_layer.mmd)
2. [`arch_02a_request_flow`](../11-diagrams/Architecture/01-system-architecture/low-level/arch_02a_request_flow.mmd)
3. [`arch_02b_composition_boundary`](../11-diagrams/Architecture/01-system-architecture/low-level/arch_02b_composition_boundary.mmd)
4. [`arch_04c_auth_audit_evidence`](../11-diagrams/Architecture/01-system-architecture/low-level/arch_04c_auth_audit_evidence.mmd)
5. [`seq_02b1_done_completion_orchestration`](../11-diagrams/Sequence/02-task-management/low-level/seq_02b1_done_completion_orchestration.mmd)
6. [`uf_04b_my_work_queue`](../11-diagrams/UserFlow/04-task-delivery/low-level/uf_04b_my_work_queue.mmd)
