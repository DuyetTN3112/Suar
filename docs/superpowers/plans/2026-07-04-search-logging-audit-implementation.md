# Search Logging And Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dual-lane observability for the search vertical so backend and frontend search flows emit correlated operational logs and audit-grade events instead of generic messages.

**Architecture:** Add a search-specific observability layer that standardizes event names, correlation metadata, and payload building across query, projection, reindex, runtime, and frontend search flows. Reuse the existing `logger` module for operational output and `audit` module for persisted event traces, while introducing search-focused helpers to keep event naming and payload construction consistent.

**Tech Stack:** AdonisJS, TypeScript, existing `app/modules/logger`, existing `app/modules/audit`, Inertia/Svelte frontend, Vitest, existing search module and HTTP adapters.

## Global Constraints

- Preserve the approved design in `docs/superpowers/specs/2026-07-04-search-logging-audit-design.md`.
- Do not log generic free-text search failures without event metadata.
- `request_id`, `trace_id`, and `flow` are required for request/runtime search paths.
- Raw query text must not be persisted by default in audit-style records; prefer `query_hash` and `query_text_length`.
- Search UI telemetry must avoid keystroke spam in persistent audit storage.
- Reuse `app/modules/logger` and `app/modules/audit` rather than inventing a third persistence mechanism.
- Keep search rollout vertical and bounded; do not widen this implementation to auth/tasks/reviews outside search integration points.

---

### Task 1: Add Search Observability Primitives

**Files:**
- Create: `app/modules/search/observability/search_event_names.ts`
- Create: `app/modules/search/observability/search_event_types.ts`
- Create: `app/modules/search/observability/search_event_context.ts`
- Create: `app/modules/search/observability/search_query_privacy.ts`
- Create: `app/modules/search/observability/search_operational_logger.ts`
- Create: `app/modules/search/observability/search_audit_logger.ts`
- Modify: `app/modules/http/adapters/http_execution_context_adapter.ts`
- Modify: `app/modules/http/actions/http_action_context.ts`
- Modify: `app/modules/logger/infra/logger_service.ts`
- Modify: `app/modules/audit/actions/public_api.ts`
- Test: `app/modules/search/tests/unit/search_observability_context.spec.ts`
- Test: `app/modules/search/tests/unit/search_query_privacy.spec.ts`
- Test: `app/modules/logger/tests/unit/logger_service_structured_event.spec.ts`

**Interfaces:**
- Consumes: existing `AuthenticatedHttpActionContext`, existing `writeAuditLog` / `writeAuditLogAllowAnonymous`, existing `LoggerService`
- Produces: `SearchEventName`, `SearchEventContext`, `buildSearchRequestContext(ctx: HttpContext)`, `buildSearchQueryPrivacyFields(query: string)`, `SearchOperationalLogger.log()`, `SearchAuditLogger.record()`

- [ ] **Step 1: Write the failing tests for request correlation and query privacy**

```ts
import { describe, expect, it } from 'vitest'

import { buildSearchQueryPrivacyFields } from '#modules/search/observability/search_query_privacy'
import { buildSearchEventContext } from '#modules/search/observability/search_event_context'

describe('search observability primitives', () => {
  it('derives stable privacy-safe query metadata', () => {
    const fields = buildSearchQueryPrivacyFields('  Elastic Search  ')

    expect(fields.queryTextLength).toBe(13)
    expect(fields.queryHash).toMatch(/^[a-f0-9]{64}$/)
    expect(fields.normalizedQuery).toBe('elastic search')
  })

  it('builds correlation metadata from request context', () => {
    const context = buildSearchEventContext({
      flow: 'command_menu_global_search',
      requestId: 'req-1',
      traceId: 'trace-1',
      actorUserId: 'user-1',
      actorOrganizationId: 'org-1',
      surface: 'command_menu',
    })

    expect(context.request.id).toBe('req-1')
    expect(context.trace.id).toBe('trace-1')
    expect(context.flow).toBe('command_menu_global_search')
    expect(context.actor.user_id).toBe('user-1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- app/modules/search/tests/unit/search_observability_context.spec.ts app/modules/search/tests/unit/search_query_privacy.spec.ts app/modules/logger/tests/unit/logger_service_structured_event.spec.ts`

Expected: FAIL with missing module or missing export errors for new search observability helpers and structured logger methods.

- [ ] **Step 3: Add request/trace fields to HTTP action context**

```ts
export interface HttpActionContext {
  userId: string | null
  ip: string
  userAgent: string
  organizationId: string | null
  requestId: string | null
  traceId: string | null
}

function resolveRequestId(ctx: HttpContext): string | null {
  return (
    (ctx.request.header('x-request-id') ?? ctx.request.header('x-correlation-id')) ??
    crypto.randomUUID()
  )
}

function resolveTraceId(ctx: HttpContext): string | null {
  return ctx.request.header('x-trace-id') ?? resolveRequestId(ctx)
}
```
```

- [ ] **Step 4: Implement search observability primitives and structured logger support**

```ts
export type SearchEventName =
  | 'search.query.started'
  | 'search.query.backend_fanout_started'
  | 'search.query.backend_fanout_completed'
  | 'search.query.completed'
  | 'search.query.failed'
  | 'search.projection.received'
  | 'search.projection.skipped'
  | 'search.projection.failed'
  | 'search.reindex.started'
  | 'search.reindex.completed'
  | 'search.runtime.ping_failed'
  | 'search.ui.submitted'
  | 'search.ui.failed'

export function buildSearchQueryPrivacyFields(query: string) {
  const normalizedQuery = query.trim().replace(/\s+/g, ' ').toLowerCase()
  return {
    normalizedQuery,
    queryTextLength: normalizedQuery.length,
    queryHash: createHash('sha256').update(normalizedQuery).digest('hex'),
  }
}

export class SearchOperationalLogger {
  log(level: LogLevel, eventName: SearchEventName, payload: SearchStructuredPayload): void {
    loggerService.logStructured(level, eventName, payload)
  }
}

export class SearchAuditLogger {
  async record(execCtx: AuditActionContext, payload: SearchStructuredPayload): Promise<void> {
    await writeAuditLogAllowAnonymous(execCtx, {
      action: payload.event_name,
      entity_type: payload.entity.type,
      entity_id: payload.entity.id,
      new_values: payload,
    })
  }
}
```

- [ ] **Step 5: Run tests to verify primitives pass**

Run: `npm run test:unit -- app/modules/search/tests/unit/search_observability_context.spec.ts app/modules/search/tests/unit/search_query_privacy.spec.ts app/modules/logger/tests/unit/logger_service_structured_event.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/modules/http/actions/http_action_context.ts \
  app/modules/http/adapters/http_execution_context_adapter.ts \
  app/modules/logger/infra/logger_service.ts \
  app/modules/audit/actions/public_api.ts \
  app/modules/search/observability \
  app/modules/search/tests/unit/search_observability_context.spec.ts \
  app/modules/search/tests/unit/search_query_privacy.spec.ts \
  app/modules/logger/tests/unit/logger_service_structured_event.spec.ts
git commit -m "feat(search): add observability primitives"
```

### Task 2: Instrument Search Query And Runtime Flows

**Files:**
- Modify: `app/modules/http/actions/queries/global_search_query.ts`
- Modify: `app/modules/http/controllers/search_api_controller.ts`
- Modify: `app/modules/search/actions/services/search_runtime_service.ts`
- Modify: `app/modules/http/health_checks/search_health_check.ts`
- Modify: `commands/search_ping.ts`
- Modify: `commands/search_reindex.ts`
- Create: `app/modules/search/tests/unit/global_search_observability.spec.ts`
- Create: `app/modules/search/tests/unit/search_runtime_service_observability.spec.ts`
- Create: `app/modules/search/tests/integration/search_command_observability.spec.ts`

**Interfaces:**
- Consumes: `SearchOperationalLogger`, `SearchAuditLogger`, `buildSearchQueryPrivacyFields`, `HttpActionContext.requestId`, `HttpActionContext.traceId`
- Produces: backend query events, runtime ping events, health-check warnings, manual reindex start/completion events

- [ ] **Step 1: Write the failing tests for query and runtime observability**

```ts
import { describe, expect, it, vi } from 'vitest'

import { GlobalSearchQuery } from '#modules/http/actions/queries/global_search_query'

describe('GlobalSearchQuery observability', () => {
  it('emits started and completed events with counts', async () => {
    const logger = { log: vi.fn() }
    const query = new GlobalSearchQuery(
      {
        userId: 'user-1',
        organizationId: 'org-1',
        ip: '127.0.0.1',
        userAgent: 'vitest',
        requestId: 'req-1',
        traceId: 'trace-1',
      },
      logger
    )

    await query.handle('elastic')

    expect(logger.log).toHaveBeenCalledWith(
      'info',
      'search.query.started',
      expect.objectContaining({
        flow: 'command_menu_global_search',
      })
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- app/modules/search/tests/unit/global_search_observability.spec.ts app/modules/search/tests/unit/search_runtime_service_observability.spec.ts`

Expected: FAIL because the query and runtime services do not yet accept or emit structured observability events.

- [ ] **Step 3: Instrument query, runtime, health, and CLI search paths**

```ts
const privacy = buildSearchQueryPrivacyFields(query)
const flow = 'command_menu_global_search'

this.operationalLogger.log('info', 'search.query.started', {
  event_name: 'search.query.started',
  event_family: 'query',
  module: 'search',
  subsystem: 'global_search',
  flow,
  stage: 'started',
  severity: 'info',
  outcome: 'success',
  actor: {
    user_id: this.execCtx.userId,
    organization_id: this.execCtx.organizationId,
    initiator_type: 'user',
  },
  request: {
    id: this.execCtx.requestId,
    ip: this.execCtx.ip,
    user_agent: this.execCtx.userAgent,
  },
  trace: {
    id: this.execCtx.traceId ?? this.execCtx.requestId,
  },
  entity: {
    type: 'search_query',
    id: null,
    scope: 'global_search',
    index_name: null,
  },
  search: {
    surface: 'command_menu',
    query_text_length: privacy.queryTextLength,
    query_hash: privacy.queryHash,
    targets: ['talents', 'tasks', 'projects', 'skills', 'organizations'],
  },
  runtime: {
    duration_ms: 0,
    enabled: true,
  },
  error: null,
  occurred_at: new Date().toISOString(),
})
```

- [ ] **Step 4: Add manual reindex and ping events to command/runtime paths**

```ts
this.operationalLogger.log('info', 'search.reindex.started', {
  flow: 'search_cli_reindex',
  actor: { initiator_type: 'cli' },
  entity: { type: 'search_index_group', id: target, scope: target, index_name },
  search: { indexed_count: 0, skipped_count: 0 },
  runtime: { batch_size: null, duration_ms: 0, enabled: true },
})

this.operationalLogger.log('warn', 'search.runtime.ping_failed', {
  flow: 'search_cli_ping',
  outcome: 'failure',
  error: { class: 'PingFailedError', message: 'Elasticsearch ping failed.' },
})
```

- [ ] **Step 5: Run tests to verify instrumentation passes**

Run: `npm run test:unit -- app/modules/search/tests/unit/global_search_observability.spec.ts app/modules/search/tests/unit/search_runtime_service_observability.spec.ts`

Run: `npm run test:unit -- app/modules/search/tests/integration/search_command_observability.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/modules/http/actions/queries/global_search_query.ts \
  app/modules/http/controllers/search_api_controller.ts \
  app/modules/search/actions/services/search_runtime_service.ts \
  app/modules/http/health_checks/search_health_check.ts \
  commands/search_ping.ts \
  commands/search_reindex.ts \
  app/modules/search/tests/unit/global_search_observability.spec.ts \
  app/modules/search/tests/unit/search_runtime_service_observability.spec.ts \
  app/modules/search/tests/integration/search_command_observability.spec.ts
git commit -m "feat(search): instrument query and runtime flows"
```

### Task 3: Instrument Projection, Listener, And Bulk Reindex Flows

**Files:**
- Modify: `app/modules/search/listeners/search_reindex_listener.ts`
- Modify: `app/modules/search/actions/services/talent_search_projection_service.ts`
- Modify: `app/modules/search/actions/services/task_search_projection_service.ts`
- Modify: `app/modules/search/actions/services/project_search_projection_service.ts`
- Modify: `app/modules/search/actions/services/organization_search_projection_service.ts`
- Modify: `app/modules/search/actions/services/user_directory_search_projection_service.ts`
- Modify: `app/modules/search/actions/services/skill_search_projection_service.ts`
- Modify: `app/modules/search/public_contracts/search_public_api.ts`
- Create: `app/modules/search/tests/unit/search_projection_observability.spec.ts`
- Create: `app/modules/search/tests/unit/search_listener_observability.spec.ts`

**Interfaces:**
- Consumes: `SearchOperationalLogger`, `SearchAuditLogger`, search event taxonomy, projection service skip rules
- Produces: `search.projection.received`, `search.projection.skipped`, `search.projection.failed`, `search.reindex.batch_progress`, `search.reindex.completed`

- [ ] **Step 1: Write the failing tests for projection skip, failure, and listener events**

```ts
import { describe, expect, it, vi } from 'vitest'

import { TaskSearchProjectionService } from '#modules/search/actions/services/task_search_projection_service'

describe('TaskSearchProjectionService observability', () => {
  it('emits skipped event when task is not public', async () => {
    const logger = { log: vi.fn() }
    const repository = { deleteDocument: vi.fn(), upsertDocument: vi.fn(), resetIndex: vi.fn(), ensureIndex: vi.fn(), bulkUpsertDocuments: vi.fn() }
    const builder = { build: vi.fn().mockResolvedValue({ task_id: 'task-1', is_public: false, assigned_to: null, deleted_at: null }) }
    const reader = { listNotDeletedTaskIds: vi.fn().mockResolvedValue(['task-1']) }
    const service = new TaskSearchProjectionService(repository as never, builder as never, reader as never, logger as never)

    await service.reindexDocument('task-1')

    expect(logger.log).toHaveBeenCalledWith(
      'info',
      'search.projection.skipped',
      expect.objectContaining({
        search: expect.objectContaining({ skip_reason: 'not_public' }),
      })
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- app/modules/search/tests/unit/search_projection_observability.spec.ts app/modules/search/tests/unit/search_listener_observability.spec.ts`

Expected: FAIL because projection services and listener do not yet emit structured search events.

- [ ] **Step 3: Add structured event emission to listener and projection services**

```ts
this.operationalLogger.log('info', 'search.projection.received', {
  flow: 'task_projection_reindex',
  stage: 'started',
  actor: { initiator_type: 'listener' },
  entity: {
    type: 'task',
    id: taskId,
    scope: 'task_search',
    index_name: this.indexName(),
  },
  search: {
    trigger_event: 'task:updated',
  },
  runtime: {
    duration_ms: 0,
    enabled: isSearchEnabled(),
    engine_operation: 'upsert',
  },
})

if (!document.is_public) {
  this.operationalLogger.log('info', 'search.projection.skipped', {
    flow: 'task_projection_reindex',
    outcome: 'skipped',
    search: {
      skip_reason: 'not_public',
    },
  })
  await this.repository.deleteDocument(taskId)
  return
}
```

- [ ] **Step 4: Add batch progress and final counts to `reindexAll()` paths**

```ts
for (const taskId of taskIds) {
  const document = await this.builder.build(taskId)
  if (!document.is_public || document.assigned_to) {
    skipped += 1
    continue
  }

  publicDocuments.push(document)

  if (publicDocuments.length % 100 === 0) {
    this.operationalLogger.log('debug', 'search.reindex.batch_progress', {
      flow: 'task_reindex_all',
      search: {
        indexed_count: publicDocuments.length,
        skipped_count: skipped,
      },
      runtime: {
        batch_size: 100,
      },
    })
  }
}
```

- [ ] **Step 5: Run tests to verify projection instrumentation passes**

Run: `npm run test:unit -- app/modules/search/tests/unit/search_projection_observability.spec.ts app/modules/search/tests/unit/search_listener_observability.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/modules/search/listeners/search_reindex_listener.ts \
  app/modules/search/actions/services/talent_search_projection_service.ts \
  app/modules/search/actions/services/task_search_projection_service.ts \
  app/modules/search/actions/services/project_search_projection_service.ts \
  app/modules/search/actions/services/organization_search_projection_service.ts \
  app/modules/search/actions/services/user_directory_search_projection_service.ts \
  app/modules/search/actions/services/skill_search_projection_service.ts \
  app/modules/search/public_contracts/search_public_api.ts \
  app/modules/search/tests/unit/search_projection_observability.spec.ts \
  app/modules/search/tests/unit/search_listener_observability.spec.ts
git commit -m "feat(search): instrument projection and reindex flows"
```

### Task 4: Add Frontend Search Telemetry And Backend Event Ingestion

**Files:**
- Modify: `inertia/components/command_menu.svelte`
- Create: `inertia/lib/search_telemetry.ts`
- Create: `app/modules/http/controllers/search_events_api_controller.ts`
- Create: `app/modules/http/actions/commands/record_search_ui_event_command.ts`
- Create: `app/modules/http/controllers/mappers/request/search_event_request_mapper.ts`
- Modify: route registration file for `/api/search/events`
- Create: `app/modules/search/tests/integration/search_ui_event_ingestion.spec.ts`
- Create: `inertia/tests/component/command_menu_search_telemetry.test.ts`

**Interfaces:**
- Consumes: `SearchAuditLogger`, `SearchOperationalLogger`, `actionContextFromHttp()` / optional action context for API ingestion
- Produces: frontend `search.ui.submitted`, `search.ui.results_loaded`, `search.ui.empty_results`, `search.ui.failed`, `search.ui.result_clicked` events with `frontend_submission_id`

- [ ] **Step 1: Write the failing tests for frontend telemetry and event ingestion**

```ts
import { describe, expect, it, vi } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/svelte'

import CommandMenu from '@/components/command_menu.svelte'

describe('command menu search telemetry', () => {
  it('sends submitted and results-loaded telemetry for global search', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { query: 'elastic', talents: [], tasks: [], projects: [], skills: [], organizations: [] } }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: null }) })

    vi.stubGlobal('fetch', fetchMock)

    const { getByPlaceholderText } = render(CommandMenu)
    const input = getByPlaceholderText('Nhập từ khóa để tìm kiếm toàn hệ thống...')

    await fireEvent.input(input, { target: { value: 'elastic' } })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/search/events',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- inertia/tests/component/command_menu_search_telemetry.test.ts app/modules/search/tests/integration/search_ui_event_ingestion.spec.ts`

Expected: FAIL because telemetry helper, ingestion route, and command do not yet exist.

- [ ] **Step 3: Add bounded frontend telemetry helper and command-menu instrumentation**

```ts
export async function postSearchUiEvent(payload: SearchUiEventPayload): Promise<void> {
  await fetch('/api/search/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

const submissionId = crypto.randomUUID()

await postSearchUiEvent({
  eventName: 'search.ui.submitted',
  flow: 'command_menu_global_search',
  surface: 'command_menu',
  frontendSubmissionId: submissionId,
  queryTextLength: query.length,
  queryHash: hashSearchQuery(query),
})
```

- [ ] **Step 4: Add backend ingestion command that writes audit and operational events**

```ts
export default class RecordSearchUiEventCommand {
  async execute(input: RecordSearchUiEventInput, execCtx: HttpActionContext): Promise<void> {
    const payload = buildSearchUiStructuredPayload(input, execCtx)

    this.operationalLogger.log('info', input.eventName, payload)

    if (
      input.eventName === 'search.ui.submitted' ||
      input.eventName === 'search.ui.failed' ||
      input.eventName === 'search.ui.empty_results' ||
      input.eventName === 'search.ui.result_clicked'
    ) {
      await this.auditLogger.record(
        {
          userId: execCtx.userId,
          ip: execCtx.ip,
          userAgent: execCtx.userAgent,
        },
        payload
      )
    }
  }
}
```

- [ ] **Step 5: Run tests to verify frontend telemetry and ingestion pass**

Run: `npm run test:unit -- inertia/tests/component/command_menu_search_telemetry.test.ts app/modules/search/tests/integration/search_ui_event_ingestion.spec.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add inertia/components/command_menu.svelte \
  inertia/lib/search_telemetry.ts \
  app/modules/http/controllers/search_events_api_controller.ts \
  app/modules/http/actions/commands/record_search_ui_event_command.ts \
  app/modules/http/controllers/mappers/request/search_event_request_mapper.ts \
  app/modules/search/tests/integration/search_ui_event_ingestion.spec.ts \
  inertia/tests/component/command_menu_search_telemetry.test.ts
git commit -m "feat(search): add frontend telemetry ingestion"
```

### Task 5: Verify End-To-End Search Observability Behavior

**Files:**
- Create: `app/modules/search/tests/integration/search_observability_end_to_end.spec.ts`
- Modify: any touched test setup files needed to mock logger/audit sinks

**Interfaces:**
- Consumes: all observability primitives and instrumentation from Tasks 1-4
- Produces: end-to-end proof that search query, projection, runtime, and UI flows emit correlated structured events

- [ ] **Step 1: Write the failing end-to-end verification test**

```ts
import { test, expect } from '@japa/runner'

test('search query and UI telemetry share correlation metadata', async ({ client }) => {
  const submissionId = 'submission-1'

  await client.post('/api/search/events').json({
    eventName: 'search.ui.submitted',
    flow: 'command_menu_global_search',
    surface: 'command_menu',
    frontendSubmissionId: submissionId,
    queryTextLength: 7,
    queryHash: 'hash-1',
  })

  const response = await client.get('/api/search').qs({ q: 'elastic' })

  expect(response.status()).toBe(200)
  expect(getCapturedSearchEvents()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event_name: 'search.ui.submitted',
        trace: expect.objectContaining({
          frontend_submission_id: submissionId,
        }),
      }),
      expect.objectContaining({
        event_name: 'search.query.completed',
      }),
    ])
  )
})
```

- [ ] **Step 2: Run the end-to-end test to verify it fails**

Run: `npm run test:unit -- app/modules/search/tests/integration/search_observability_end_to_end.spec.ts`

Expected: FAIL until all correlation and ingestion pieces are wired together.

- [ ] **Step 3: Add any missing glue for cross-flow correlation**

```ts
trace: {
  id: execCtx.traceId ?? execCtx.requestId,
  frontend_submission_id: input.frontendSubmissionId ?? null,
  correlation_key: `${input.surface}:${input.queryHash}`,
},
```

- [ ] **Step 4: Run focused and broad verification**

Run: `npm run test:unit -- app/modules/search/tests/unit/search_observability_context.spec.ts`

Run: `npm run test:unit -- app/modules/search/tests/unit/global_search_observability.spec.ts app/modules/search/tests/unit/search_projection_observability.spec.ts app/modules/search/tests/unit/search_runtime_service_observability.spec.ts`

Run: `npm run test:unit -- app/modules/search/tests/integration/search_command_observability.spec.ts app/modules/search/tests/integration/search_ui_event_ingestion.spec.ts app/modules/search/tests/integration/search_observability_end_to_end.spec.ts`

Run: `npm run test:unit -- inertia/tests/component/command_menu_search_telemetry.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/search/tests/integration/search_observability_end_to_end.spec.ts
git commit -m "test(search): verify end-to-end observability"
```

## Self-Review Checklist

- Spec coverage:
  - Dual-lane observability: covered in Tasks 1-4
  - Canonical schema: covered in Task 1
  - Query flow: covered in Task 2
  - Projection and reindex flow: covered in Task 3
  - Health/runtime flow: covered in Task 2
  - Frontend event groups: covered in Task 4
  - Correlation requirements: covered in Tasks 1, 2, and 5
  - Privacy-safe query handling: covered in Task 1

- Placeholder scan:
  - No TBD/TODO placeholders remain in tasks or code snippets.

- Type consistency:
  - Shared output names are consistent across tasks: `SearchOperationalLogger`, `SearchAuditLogger`, `SearchEventName`, `buildSearchQueryPrivacyFields`, `frontendSubmissionId`.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-04-search-logging-audit-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
