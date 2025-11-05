# Platform Observability Rollout Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Roll out industrial-grade observability across all critical modules and workflows by building a shared platform foundation first, then implementing search as the proving vertical, then expanding to high-risk business flows and remaining modules.

**Architecture:** Build shared observability primitives once in the platform layer, use search as the first full vertical to validate the contract, then apply the same schema/correlation/audit split to auth, tasks, reviews, admin, and the remaining modules in controlled waves. The final system must support both machine-readable runtime diagnosis and human-meaningful workflow investigation.

**Tech Stack:** AdonisJS, TypeScript, existing `logger` and `audit` modules, Inertia/Svelte frontend, existing domain modules, Vitest/Japa-style backend tests, frontend component tests.

## Global Constraints

- Conform to `docs/superpowers/specs/2026-07-04-platform-observability-design.md`.
- Conform to `docs/superpowers/specs/2026-07-04-search-logging-audit-design.md` for the search pilot.
- Do not ship per-module bespoke logging contracts.
- Correlation metadata is mandatory for critical workflows.
- Use phased rollout; do not attempt big-bang implementation across all modules in one change.
- Search-only instrumentation is not considered end-state completion.
- High-risk workflows take priority over complete module count.

---

### Task 1: Build Shared Platform Observability Foundation

**Files:**
- Create: `app/modules/observability/contracts/platform_event.ts`
- Create: `app/modules/observability/contracts/platform_event_names.ts`
- Create: `app/modules/observability/services/platform_operational_logger.ts`
- Create: `app/modules/observability/services/platform_audit_logger.ts`
- Create: `app/modules/observability/services/platform_workflow_logger.ts`
- Create: `app/modules/observability/services/platform_redaction.ts`
- Create: `app/modules/observability/services/platform_trace_context.ts`
- Modify: `app/modules/http/actions/http_action_context.ts`
- Modify: `app/modules/http/adapters/http_execution_context_adapter.ts`
- Modify: `app/modules/logger/infra/logger_service.ts`
- Modify: `app/modules/audit/actions/public_api.ts`
- Test: `app/modules/observability/tests/unit/platform_event_contract.spec.ts`
- Test: `app/modules/observability/tests/unit/platform_trace_context.spec.ts`
- Test: `app/modules/observability/tests/unit/platform_redaction.spec.ts`

**Interfaces:**
- Consumes: existing logger service, existing audit public API, existing HTTP action context
- Produces: `PlatformEvent`, `PlatformTraceContext`, `PlatformOperationalLogger`, `PlatformAuditLogger`, `PlatformWorkflowLogger`

- [ ] **Step 1: Write the failing platform contract tests**

```ts
import { describe, expect, it } from 'vitest'

import type { PlatformEvent } from '#modules/observability/contracts/platform_event'
import { buildPlatformTraceContext } from '#modules/observability/services/platform_trace_context'

describe('PlatformEvent contract', () => {
  it('requires correlation metadata for workflow-grade events', () => {
    const trace = buildPlatformTraceContext({
      requestId: 'req-1',
      workflow: 'task_application_review',
    })

    const event: PlatformEvent = {
      event_name: 'task.application.submitted',
      event_family: 'workflow',
      module: 'tasks',
      subsystem: 'applications',
      workflow: 'task_application_review',
      stage: 'started',
      severity: 'info',
      outcome: 'success',
      occurred_at: new Date().toISOString(),
      actor: { initiator_type: 'user', user_id: 'user-1' },
      request: { id: 'req-1' },
      trace,
      target: { type: 'task', id: 'task-1', scope: 'task_application' },
      change: null,
      runtime: { duration_ms: 0, enabled: true },
      error: null,
      compliance: { redaction_applied: true, retention_class: 'support_trace' },
    }

    expect(event.trace.id).toBeDefined()
    expect(event.trace.workflow_id).toBe('task_application_review')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- app/modules/observability/tests/unit/platform_event_contract.spec.ts app/modules/observability/tests/unit/platform_trace_context.spec.ts app/modules/observability/tests/unit/platform_redaction.spec.ts`

Expected: FAIL because platform observability contract files do not yet exist.

- [ ] **Step 3: Implement platform-wide primitives**

```ts
export interface PlatformEvent {
  event_name: string
  event_family: string
  module: string
  subsystem: string
  workflow: string
  stage: string
  severity: 'trace' | 'debug' | 'info' | 'warn' | 'error'
  outcome: 'success' | 'failure' | 'skipped' | 'warning'
  occurred_at: string
  actor: Record<string, unknown>
  request: Record<string, unknown> | null
  trace: {
    id: string
    workflow_id: string
    parent_id?: string | null
    frontend_submission_id?: string | null
    correlation_key?: string | null
  }
  target: Record<string, unknown> | null
  change: Record<string, unknown> | null
  runtime: Record<string, unknown> | null
  error: Record<string, unknown> | null
  compliance: {
    redaction_applied: boolean
    retention_class: 'transient_runtime' | 'support_trace' | 'security_audit' | 'compliance_audit'
  }
}
```

- [ ] **Step 4: Run tests to verify the platform contract passes**

Run: `npm run test:unit -- app/modules/observability/tests/unit/platform_event_contract.spec.ts app/modules/observability/tests/unit/platform_trace_context.spec.ts app/modules/observability/tests/unit/platform_redaction.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/observability \
  app/modules/http/actions/http_action_context.ts \
  app/modules/http/adapters/http_execution_context_adapter.ts \
  app/modules/logger/infra/logger_service.ts \
  app/modules/audit/actions/public_api.ts
git commit -m "feat(observability): add platform foundation"
```

### Task 2: Implement Search As The First Full Vertical

**Files:**
- Reuse: all files from `docs/superpowers/plans/2026-07-04-search-logging-audit-implementation.md`
- Modify: search observability files to depend on platform primitives instead of bespoke one-off contracts
- Test: search pilot tests from the search implementation plan

**Interfaces:**
- Consumes: `PlatformEvent`, `PlatformOperationalLogger`, `PlatformAuditLogger`, `PlatformWorkflowLogger`
- Produces: first complete end-to-end validated vertical proving platform observability

- [ ] **Step 1: Rebase the search plan on platform primitives**

```ts
export interface SearchEvent extends PlatformEvent {
  module: 'search'
  search: {
    surface?: string | null
    query_hash?: string | null
    query_text_length?: number | null
    result_counts?: Record<string, number> | null
    skip_reason?: string | null
  }
}
```

- [ ] **Step 2: Run the search pilot tests**

Run: `npm run test:unit -- app/modules/search/tests/unit/search_observability_context.spec.ts app/modules/search/tests/unit/global_search_observability.spec.ts app/modules/search/tests/unit/search_projection_observability.spec.ts`

Expected: FAIL until search is fully wired to platform observability services.

- [ ] **Step 3: Implement and verify the search pilot**

Run: `npm run test:unit -- app/modules/search/tests/integration/search_command_observability.spec.ts app/modules/search/tests/integration/search_ui_event_ingestion.spec.ts app/modules/search/tests/integration/search_observability_end_to_end.spec.ts inertia/tests/component/command_menu_search_telemetry.test.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/modules/search app/modules/http/controllers/search_events_api_controller.ts inertia/components/command_menu.svelte inertia/lib/search_telemetry.ts
git commit -m "feat(search): implement platform observability pilot"
```

### Task 3: Instrument High-Risk Cross-Module Workflows

**Files:**
- Modify: `app/modules/auth/**` entry points and listeners relevant to login and social auth
- Modify: `app/modules/tasks/**` application lifecycle commands and controllers
- Modify: `app/modules/reviews/**` dispute and review lifecycle commands/listeners
- Modify: `app/modules/admin/**` privileged action entry points
- Create: workflow-specific observability helpers under `app/modules/observability/workflows/`
- Test: `app/modules/auth/tests/**`
- Test: `app/modules/tasks/tests/**`
- Test: `app/modules/reviews/tests/**`
- Test: `app/modules/admin/tests/**`

**Interfaces:**
- Consumes: platform observability services
- Produces: industrial-grade tracing for the highest-risk business flows

- [ ] **Step 1: Write failing workflow tests for auth, task application, and review dispute**

```ts
test('auth login emits started, success, and failure events with shared workflow id', async () => {
  expect(getCapturedPlatformEvents()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ event_name: 'auth.login.started', workflow: 'user_login' }),
      expect.objectContaining({ event_name: 'auth.login.completed', workflow: 'user_login' }),
    ])
  )
})
```

- [ ] **Step 2: Run the high-risk workflow test suite to verify it fails**

Run: `npm run test:unit -- app/modules/auth/tests app/modules/tasks/tests app/modules/reviews/tests app/modules/admin/tests`

Expected: FAIL because these modules do not yet emit standardized workflow events.

- [ ] **Step 3: Instrument the high-risk workflows**

```ts
this.workflowLogger.checkpoint({
  event_name: 'task.application.submitted',
  module: 'tasks',
  subsystem: 'applications',
  workflow: 'task_application_review',
  stage: 'persisted',
  actor: { user_id: applicantId, initiator_type: 'user' },
  target: { type: 'task_application', id: applicationId, parent_type: 'task', parent_id: taskId },
})
```

- [ ] **Step 4: Run tests to verify high-risk workflows pass**

Run: `npm run test:unit -- app/modules/auth/tests app/modules/tasks/tests app/modules/reviews/tests app/modules/admin/tests`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/auth app/modules/tasks app/modules/reviews app/modules/admin app/modules/observability/workflows
git commit -m "feat(observability): instrument high-risk workflows"
```

### Task 4: Roll Out Remaining Modules And Frontend Critical Flows

**Files:**
- Modify: `app/modules/organizations/**`
- Modify: `app/modules/projects/**`
- Modify: `app/modules/users/**`
- Modify: `app/modules/skills/**`
- Modify: `app/modules/notifications/**`
- Modify: `app/modules/settings/**`
- Modify: critical frontend surfaces under `inertia/pages/**` and `inertia/components/**`
- Test: corresponding module test folders and critical frontend component tests

**Interfaces:**
- Consumes: platform observability services and workflow helpers
- Produces: consistent observability coverage beyond the pilot and high-risk waves

- [ ] **Step 1: Write failing coverage tests for one representative flow per remaining module**

```ts
test('organization membership approval emits workflow checkpoints', async () => {
  expect(getCapturedPlatformEvents()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ event_name: 'organization.membership.approved' }),
    ])
  )
})
```

- [ ] **Step 2: Run the remaining-module suite to verify it fails**

Run: `npm run test:unit -- app/modules/organizations/tests app/modules/projects/tests app/modules/users/tests app/modules/skills/tests app/modules/notifications/tests app/modules/settings/tests inertia/tests`

Expected: FAIL until remaining module flows are instrumented.

- [ ] **Step 3: Implement remaining-module instrumentation**

```ts
this.auditLogger.record({
  event_name: 'organization.membership.approved',
  module: 'organizations',
  subsystem: 'membership',
  workflow: 'organization_join_flow',
  stage: 'completed',
  target: { type: 'organization_membership', id: membershipId, parent_id: organizationId },
})
```

- [ ] **Step 4: Run tests to verify the remaining-module rollout passes**

Run: `npm run test:unit -- app/modules/organizations/tests app/modules/projects/tests app/modules/users/tests app/modules/skills/tests app/modules/notifications/tests app/modules/settings/tests inertia/tests`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/organizations app/modules/projects app/modules/users app/modules/skills app/modules/notifications app/modules/settings inertia/pages inertia/components
git commit -m "feat(observability): expand platform coverage"
```

### Task 5: Add Investigation Surfaces And Verification Gates

**Files:**
- Modify: `app/modules/admin/**` audit log read/query surfaces
- Create: `app/modules/observability/**` read/query helpers for workflow timelines
- Create: admin or support UI surfaces for filtering by trace/workflow/module/actor
- Modify: CI or verification scripts to enforce observability contract checks on critical flows
- Test: admin/support integration tests and contract tests

**Interfaces:**
- Consumes: platform event store shape and audit read APIs
- Produces: usable investigation surface instead of raw storage only

- [ ] **Step 1: Write failing tests for workflow timeline retrieval and admin filtering**

```ts
test('admin can filter workflow events by trace id and module', async () => {
  const response = await client.get('/admin/audit-logs').qs({
    trace_id: 'trace-1',
    module: 'tasks',
  })

  expect(response.status()).toBe(200)
  expect(response.body().data[0].traceId).toBe('trace-1')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- app/modules/admin/tests`

Expected: FAIL because timeline-aware filtering and workflow-oriented admin support surfaces do not yet exist.

- [ ] **Step 3: Implement timeline retrieval and verification gates**

```ts
export interface WorkflowTimelineFilter {
  traceId?: string
  workflow?: string
  module?: string
  actorUserId?: string
  targetType?: string
}
```

- [ ] **Step 4: Run final verification**

Run: `npm run test:unit`

Run: `npm run lint`

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/admin app/modules/observability scripts
git commit -m "feat(observability): add investigation surfaces and gates"
```

## Self-Review Checklist

- Spec coverage:
  - Platform-wide standard: covered by Tasks 1-5
  - Search pilot: covered by Task 2
  - High-risk workflows: covered by Task 3
  - Remaining modules: covered by Task 4
  - Investigation surfaces: covered by Task 5

- Placeholder scan:
  - No TBD/TODO placeholders remain in task steps or snippets.

- Type consistency:
  - Shared names remain consistent: `PlatformEvent`, `PlatformOperationalLogger`, `PlatformAuditLogger`, `PlatformWorkflowLogger`, `workflow_id`, `trace.id`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-04-platform-observability-rollout.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
