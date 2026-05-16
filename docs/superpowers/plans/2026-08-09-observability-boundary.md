# Observability Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make observability a clean independent platform module with pure public contracts and composition-wired implementations.

**Architecture:** Keep event/trace/redaction contracts in `public_contracts`; move operational/audit/workflow logger implementations to `infra/adapters`; instantiate and connect them from composition. Preserve existing telemetry behavior and migrate consumers incrementally.

**Tech Stack:** TypeScript, AdonisJS composition providers, Japa tests, repository architecture scripts, GitNexus CLI.

## Global Constraints

- Preserve unrelated existing worktree changes.
- Do not introduce a shared/support module.
- No production code change without a failing test first.
- No symbol edit without `gitnexus impact` first.
- Do not commit without `gitnexus detect-changes`.

---

### Task 1: Establish contract boundary tests

**Files:**
- Modify: `app/modules/observability/tests/backend/unit/record_platform_ui_event_command.spec.ts`
- Create: `app/modules/observability/tests/backend/architecture/observability_public_surface.spec.ts`

**Interfaces:**
- Assert the existing UI telemetry behavior through injected logger ports.
- Assert that the observability public barrel does not export concrete logger instances/classes.

- [ ] Add a failing architecture test that reads `platform_observability.ts` and rejects concrete singleton/class exports.
- [ ] Run the focused architecture test and confirm it fails against the current barrel.
- [ ] Keep the existing command behavior tests as the regression contract.

### Task 2: Move logger implementations behind infrastructure

**Files:**
- Modify: `app/modules/observability/public_contracts/platform_audit_logger.ts`
- Modify: `app/modules/observability/public_contracts/platform_operational_logger.ts`
- Modify: `app/modules/observability/public_contracts/platform_workflow_logger.ts`
- Modify: `app/modules/observability/public_contracts/platform_observability.ts`
- Modify: `app/modules/observability/infra/adapters/operational-events/platform_audit_logger.ts`
- Modify: `app/modules/observability/infra/adapters/operational-events/platform_operational_logger.ts`
- Modify: `app/modules/observability/infra/adapters/operational-events/platform_workflow_logger.ts`

**Interfaces:**
- Public contracts expose `PlatformAuditLoggerPort`, `PlatformOperationalLoggerPort`, and `PlatformWorkflowLoggerPort` interfaces only.
- Concrete adapters retain current method signatures and behavior.

- [ ] Replace public implementation exports with pure interfaces.
- [ ] Keep redaction and event mapping behavior in infra adapters.
- [ ] Run focused unit tests and fix imports through composition.

### Task 3: Wire runtime dependencies through composition

**Files:**
- Modify: `app/composition/observability/platform/platform_operational_logger_composition.ts`
- Modify: `app/composition/observability/platform/platform_ui_events_composition.ts`
- Create or modify: `app/composition/observability/platform/platform_workflow_logger_composition.ts`
- Modify: `app/modules/observability/actions/commands/operational-events/record_platform_ui_event_command.ts`

**Interfaces:**
- Commands consume narrow ports through constructors.
- Composition exports capabilities, not public-contract singletons.

- [ ] Add/adjust failing tests for constructor injection.
- [ ] Instantiate concrete adapters in composition.
- [ ] Wire the UI capability with injected operational and audit ports.
- [ ] Run UI telemetry unit and integration tests.

### Task 4: Migrate consumers and remove the implementation barrel

**Files:**
- Modify: consumers importing `platform_observability` concrete exports.
- Modify: `app/composition/adapters/observability/project_membership_observability_adapter.ts`.
- Modify: `app/composition/adapters/http/http_platform_ui_event_writer_adapter.ts`.

**Interfaces:**
- Feature modules use event/trace types and narrow ports only.
- HTTP uses the composition-owned UI capability adapter.

- [ ] Migrate imports without changing business behavior.
- [ ] Remove obsolete implementation exports and duplicate runtime instances.
- [ ] Run architecture checks and focused tests.

### Task 5: Verify the refactor

**Files:**
- No production file changes planned.

- [ ] Run observability unit/integration tests.
- [ ] Run backend public-contract, module-layer, side-effect, and port-taxonomy checks.
- [ ] Run typecheck.
- [ ] Run `gitnexus detect-changes` and inspect the resulting scope.
