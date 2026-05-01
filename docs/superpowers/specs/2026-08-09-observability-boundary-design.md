# Observability Boundary Design

## Goal

Keep `app/modules/observability` as an independent platform capability while making its public surface contract-only and moving concrete logging/audit behavior behind infrastructure and composition.

## Design

- `public_contracts` owns pure event, trace, redaction, and sink/capability interfaces.
- `infra/adapters` owns concrete operational, audit, and workflow logger implementations.
- `app/composition` owns runtime instances and wires dependencies.
- HTTP owns request mapping and its adapter; observability does not expose HTTP-specific implementation through a public barrel.
- Audit remains the owner of durable audit storage and reads. Logger remains the owner of the process logging primitive. Events remains the owner of domain event delivery/outbox.
- Existing feature behavior is preserved: UI telemetry always emits operational telemetry and persists audit evidence only when `persist` is true.

## Boundary rules

1. No concrete logger/audit singleton is exported from `platform_observability.ts`.
2. Observability public contracts must not import concrete logger or audit implementations.
3. Composition creates concrete instances and passes them into commands/capabilities.
4. Existing consumers are migrated to narrow public contracts or composition-owned adapters where their current dependency is concrete behavior.

## Verification

- Unit tests cover the UI telemetry behavior and dependency injection.
- Architecture checks reject implementation exports from the observability public surface.
- Focused observability tests, typecheck, and backend architecture checks must pass.
