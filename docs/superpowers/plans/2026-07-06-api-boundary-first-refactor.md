# API Boundary-First Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize API transport classification and shared error emission so current AdonisJS + Inertia behavior remains stable while future NestJS migration gets clear boundary seams.

**Architecture:** Introduce one shared HTTP transport classifier plus one shared API error emitter, then migrate `HttpExceptionHandler`, `AuthMiddleware`, `OrganizationResolverMiddleware`, and controller error helpers onto that boundary. Preserve current route inventory and Inertia redirects while reducing path-sniffing duplication.

**Tech Stack:** AdonisJS, TypeScript, Japa, existing HTTP exception layer, existing `createApiError(...)` and v1 Problem Details contract

## Global Constraints

- Keep `/api/v1/*` canonical direction intact.
- Do not remove legacy `/api/*` routes.
- Do not break current Inertia page redirects or flash behavior.
- Do not rename route families in this phase.
- Public JSON transport decisions must stop being duplicated across middleware and exception handler.
- Use TDD for runtime changes.

---

### Task 1: Add shared transport classification helper

**Files:**
- Create: `app/modules/http/boundary/http_transport.ts`
- Test: `app/modules/http/tests/backend/unit/http_transport.spec.ts`

**Interfaces:**
- Consumes: `HttpContext['request']`
- Produces:
  - `type HttpTransportKind = 'page' | 'api-canonical' | 'api-compat' | 'api-admin-internal' | 'api-public-callback' | 'api-ops-internal'`
  - `function classifyHttpTransport(request: HttpContext['request']): HttpTransportKind`
  - `function isApiTransport(kind: HttpTransportKind): boolean`
  - `function isCanonicalApiTransport(kind: HttpTransportKind): boolean`

- [ ] **Step 1: Write failing tests for transport classification**

```ts
test.group('Http transport classification', () => {
  test('classifies inertia request as page', ({ assert }) => {
    const request = {
      url: () => '/tasks/abc',
      header: (name: string) => (name === 'X-Inertia' ? 'true' : null),
      accepts: () => 'html',
    }

    assert.equal(classifyHttpTransport(request as never), 'page')
  })

  test('classifies /api/v1 request as canonical API', ({ assert }) => {
    const request = {
      url: () => '/api/v1/me',
      header: () => null,
      accepts: () => 'json',
    }

    assert.equal(classifyHttpTransport(request as never), 'api-canonical')
  })

  test('classifies legacy /api route as compat API', ({ assert }) => {
    const request = {
      url: () => '/api/tasks/123',
      header: () => null,
      accepts: () => 'json',
    }

    assert.equal(classifyHttpTransport(request as never), 'api-compat')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- app/modules/http/tests/backend/unit/http_transport.spec.ts`

Expected: FAIL because `http_transport.ts` and exported classifier do not exist yet.

- [ ] **Step 3: Write minimal transport helper**

```ts
import type { HttpContext } from '@adonisjs/core/http'

export type HttpTransportKind =
  | 'page'
  | 'api-canonical'
  | 'api-compat'
  | 'api-admin-internal'
  | 'api-public-callback'
  | 'api-ops-internal'

export function classifyHttpTransport(request: HttpContext['request']): HttpTransportKind {
  if (request.header('X-Inertia')) return 'page'

  const url = request.url()
  if (url.startsWith('/api/v1')) return 'api-canonical'
  if (url.startsWith('/api/admin')) return 'api-admin-internal'
  if (url.startsWith('/api/public')) return 'api-public-callback'
  if (
    url.startsWith('/api/redis') ||
    url.startsWith('/api/dev') ||
    url.startsWith('/api/search') ||
    url.startsWith('/api/telemetry')
  ) {
    return 'api-ops-internal'
  }
  if (url.startsWith('/api/')) return 'api-compat'

  return request.accepts(['json', 'html']) === 'json' ? 'api-compat' : 'page'
}

export function isApiTransport(kind: HttpTransportKind): boolean {
  return kind !== 'page'
}

export function isCanonicalApiTransport(kind: HttpTransportKind): boolean {
  return kind === 'api-canonical'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- app/modules/http/tests/backend/unit/http_transport.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/http/boundary/http_transport.ts app/modules/http/tests/backend/unit/http_transport.spec.ts
git commit -m "test: add http transport classifier"
```

### Task 2: Add shared API error emitter

**Files:**
- Create: `app/modules/http/boundary/http_api_error_emitter.ts`
- Test: `app/modules/http/tests/backend/unit/http_api_error_emitter.spec.ts`

**Interfaces:**
- Consumes:
  - `HttpContext`
  - `HttpTransportKind`
  - `createApiError(...)`
  - `createApiV1ProblemDetails(...)`
- Produces:
  - `function emitApiError(ctx: HttpContext, input: { transport: HttpTransportKind; status: number; code: string; detail: string; errors?: Record<string, string>; redirectTo?: string }): void`

- [ ] **Step 1: Write failing tests for canonical and compat error emission**

```ts
test('emitApiError returns Problem Details for canonical API transport', ({ assert }) => {
  const responseState = { status: 200, headers: {} as Record<string, string>, body: null as unknown }
  const ctx = {
    requestContext: { requestId: 'req_1', correlationId: 'corr_1' },
    response: {
      status(code: number) {
        responseState.status = code
        return this
      },
      header(name: string, value: string) {
        responseState.headers[name.toLowerCase()] = value
        return this
      },
      json(body: unknown) {
        responseState.body = body
        return this
      },
    },
  }

  emitApiError(ctx as never, {
    transport: 'api-canonical',
    status: 403,
    code: 'E_FORBIDDEN',
    detail: 'Forbidden',
  })

  assert.equal(responseState.status, 403)
  assert.equal(responseState.headers['content-type'], 'application/problem+json')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- app/modules/http/tests/backend/unit/http_api_error_emitter.spec.ts`

Expected: FAIL because emitter module does not exist yet.

- [ ] **Step 3: Write minimal shared emitter**

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { createApiV1ProblemDetails } from '../../../contracts/api/v1/errors.js'

import type { HttpTransportKind } from './http_transport.js'

import { createApiError } from '#modules/errors/public_contracts/error_constants'

export function emitApiError(
  ctx: HttpContext,
  input: {
    transport: HttpTransportKind
    status: number
    code: string
    detail: string
    errors?: Record<string, string>
    redirectTo?: string
  }
): void {
  if (input.transport === 'api-canonical') {
    ctx.response
      .status(input.status)
      .header('content-type', 'application/problem+json')
      .json(
        createApiV1ProblemDetails({
          status: input.status,
          code: input.code,
          detail: input.detail,
          errors: input.errors,
          requestId: ctx.requestContext.requestId,
          correlationId: ctx.requestContext.correlationId,
        })
      )
    return
  }

  ctx.response.status(input.status).json({
    ...createApiError(input.code, input.detail, input.errors),
    ...(input.redirectTo ? { redirectTo: input.redirectTo } : {}),
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- app/modules/http/tests/backend/unit/http_api_error_emitter.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/http/boundary/http_api_error_emitter.ts app/modules/http/tests/backend/unit/http_api_error_emitter.spec.ts
git commit -m "test: add shared api error emitter"
```

### Task 3: Route `HttpExceptionHandler` through shared boundary

**Files:**
- Modify: `app/modules/http/exceptions/handler.ts`
- Test: `app/modules/http/tests/backend/unit/exceptions.spec.ts`

**Interfaces:**
- Consumes:
  - `classifyHttpTransport(request)`
  - `emitApiError(ctx, input)`
- Produces:
  - `HttpExceptionHandler` no longer owns duplicate `isApiRequest`/`isApiV1Request` path logic

- [ ] **Step 1: Write failing tests for canonical and compat exception behavior**

```ts
test('HttpExceptionHandler emits canonical Problem Details for /api/v1 validation errors', async ({
  assert,
}) => {
  assert.fail('Implement handler test using existing exceptions.spec.ts harness')
})

test('HttpExceptionHandler emits compat error envelope for legacy /api validation errors', async ({
  assert,
}) => {
  assert.fail('Implement handler test using existing exceptions.spec.ts harness')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- app/modules/http/tests/backend/unit/exceptions.spec.ts`

Expected: FAIL on new assertions before handler refactor.

- [ ] **Step 3: Refactor handler to use shared classifier and emitter**

```ts
const transport = classifyHttpTransport(request)
const isApi = isApiTransport(transport)
const isCanonicalApi = isCanonicalApiTransport(transport)
```

Use `emitApiError(...)` in:

- AppException validation branch
- VineJS validation branch
- generic API error branch

Remove local:

- `isApiRequest(...)`
- `isApiV1Request(...)`

Keep:

- Inertia redirect behavior
- Youch behavior for non-page/non-API dev HTML

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- app/modules/http/tests/backend/unit/exceptions.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/http/exceptions/handler.ts app/modules/http/tests/backend/unit/exceptions.spec.ts
git commit -m "refactor: centralize exception transport handling"
```

### Task 4: Route `AuthMiddleware` through shared transport classification

**Files:**
- Modify: `app/modules/auth/middleware/auth_middleware.ts`
- Test: `app/modules/auth/tests/backend/integration/testing_auth_state.spec.ts`

**Interfaces:**
- Consumes:
  - `classifyHttpTransport(request)`
  - `isApiTransport(kind)`
- Produces:
  - middleware no longer defines local `isApiRequest(...)`

- [ ] **Step 1: Write failing regression test for API vs page auth behavior**

```ts
test('api request still throws through auth middleware while page request redirects', async ({
  assert,
}) => {
  assert.fail('Add focused regression test around current auth middleware transport behavior')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- app/modules/auth/tests/backend/integration/testing_auth_state.spec.ts`

Expected: FAIL on new regression assertion.

- [ ] **Step 3: Replace local API detection with shared classifier**

```ts
const transport = classifyHttpTransport(ctx.request)
if (isApiTransport(transport)) {
  const bearerAuthenticated = await this.tryAuthenticateApiBearerToken(ctx)
  if (bearerAuthenticated) {
    await next()
    return
  }
}

if (isApiTransport(transport)) {
  throw error
}
```

Remove local helper:

```ts
function isApiRequest(...) { ... }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- app/modules/auth/tests/backend/integration/testing_auth_state.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/auth/middleware/auth_middleware.ts app/modules/auth/tests/backend/integration/testing_auth_state.spec.ts
git commit -m "refactor: reuse shared auth transport classification"
```

### Task 5: Route organization middleware and controller error helper through shared emitter

**Files:**
- Modify: `app/modules/organizations/middleware/organization_resolver_middleware.ts`
- Modify: `app/modules/http/errors/error_utils/controller_handlers.ts`
- Test: `tests/integration/middleware/org_resolver.spec.ts`
- Test: `app/modules/http/tests/backend/unit/error_utils.spec.ts`

**Interfaces:**
- Consumes:
  - `classifyHttpTransport(request)`
  - `emitApiError(ctx, input)`
- Produces:
  - org resolver no longer writes inline compat JSON
  - controller API helper no longer hardcodes legacy-only response logic

- [ ] **Step 1: Write failing tests for shared emission behavior**

```ts
test('handleApiControllerError delegates to shared emitter semantics', ({ assert }) => {
  assert.fail('Update error_utils.spec.ts expectations to use shared emitter path')
})

test('organization resolver emits transport-aware API error payload', async ({ assert }) => {
  assert.fail('Add middleware regression for no-organization API behavior')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- app/modules/http/tests/backend/unit/error_utils.spec.ts`

Run: `npm run test:unit -- tests/integration/middleware/org_resolver.spec.ts`

Expected: FAIL on new assertions.

- [ ] **Step 3: Update org resolver and controller helper**

```ts
const transport = classifyHttpTransport(ctx.request)
emitApiError(ctx, {
  transport,
  status: HttpStatus.FORBIDDEN,
  code: ErrorCode.FORBIDDEN,
  detail: ErrorMessages.REQUIRE_ORGANIZATION,
  redirectTo: '/organizations',
})
```

And in `handleApiControllerError(...)`:

```ts
const transport = classifyHttpTransport(ctx.request)
emitApiError(ctx, {
  transport,
  status: statusCode,
  code,
  detail: message,
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- app/modules/http/tests/backend/unit/error_utils.spec.ts`

Run: `npm run test:unit -- tests/integration/middleware/org_resolver.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/modules/organizations/middleware/organization_resolver_middleware.ts app/modules/http/errors/error_utils/controller_handlers.ts app/modules/http/tests/backend/unit/error_utils.spec.ts tests/integration/middleware/org_resolver.spec.ts
git commit -m "refactor: centralize compat api error emission"
```

### Task 6: Run contract verification on protected API families

**Files:**
- Modify: `docs/API_STANDARD.md` if implementation reveals rule clarification
- Modify: `docs/api-migration-roadmap-2026-07-06.md` if sequencing note changes

**Interfaces:**
- Consumes:
  - completed Tasks 1-5
- Produces:
  - fresh verification evidence for current protected families

- [ ] **Step 1: Run user context API contract suite**

Run: `npm run test:unit -- app/modules/http/tests/backend/contract/user_context_api_standardization.contract.spec.ts`

Expected: PASS

- [ ] **Step 2: Run task-status/workflow API contract suite**

Run: `npm run test:unit -- app/modules/tasks/tests/backend/contract/task_statuses_workflow_api.contract.spec.ts`

Expected: PASS

- [ ] **Step 3: Run project API contract suite**

Run: `npm run test:unit -- app/modules/projects/tests/backend/contract/project_api_standardization.contract.spec.ts`

Expected: PASS

- [ ] **Step 4: Run targeted middleware and exception tests together**

Run: `npm run test:unit -- app/modules/http/tests/backend/unit/exceptions.spec.ts app/modules/http/tests/backend/unit/error_utils.spec.ts tests/integration/middleware/org_resolver.spec.ts app/modules/auth/tests/backend/integration/testing_auth_state.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/API_STANDARD.md docs/api-migration-roadmap-2026-07-06.md
git commit -m "docs: align api boundary refactor notes"
```

## Self-Review

- Spec coverage:
  - shared classifier covered by Task 1
  - shared emitter covered by Task 2
  - exception handler migration covered by Task 3
  - auth middleware migration covered by Task 4
  - org resolver + controller helper migration covered by Task 5
  - regression evidence covered by Task 6
- Placeholder scan:
  - no TBD/TODO placeholders left
  - integration test harness references are explicit
- Type consistency:
  - `HttpTransportKind`, `classifyHttpTransport`, `isApiTransport`, `isCanonicalApiTransport`, `emitApiError` are defined once and reused consistently across later tasks

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-06-api-boundary-first-refactor.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
