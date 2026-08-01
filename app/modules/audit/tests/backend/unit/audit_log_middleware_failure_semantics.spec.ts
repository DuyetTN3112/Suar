import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import type { AuditLogEvent } from '#modules/audit/events/audit_events'
import AuditLogMiddleware from '#modules/audit/middleware/audit_log_middleware'

function toHttpContext(value: unknown): HttpContext {
  return value as HttpContext
}

function context(overrides: Record<string, unknown> = {}): HttpContext {
  return toHttpContext({
    auth: {
      user: {
        id: '11111111-1111-4111-8111-111111111111',
      },
    },
    params: {
      taskId: 'task-1',
    },
    request: {
      method: () => 'POST',
      url: () => '/tasks/task-1?code=oauth-secret&email=private@example.com',
      ip: () => '127.0.0.1',
      header: () => 'Agent private@example.com token=raw-secret',
    },
    response: {
      getStatus: () => 204,
    },
    ...overrides,
  })
}

test.group('AuditLogMiddleware failure semantics', () => {
  test('snapshots bounded redacted metadata without query strings', async ({ assert }) => {
    const events: AuditLogEvent[] = []
    const times = [100, 125]
    const middleware = new AuditLogMiddleware({
      emit: (event) => {
        events.push(event)
        return Promise.resolve()
      },
      now: () => times.shift() ?? 125,
      timeoutMs: 100,
    })

    await middleware.handle(context(), () => Promise.resolve(), {
      action: 'task.update',
      entityType: 'task',
    })

    assert.lengthOf(events, 1)
    assert.equal(events[0]?.userId, '11111111-1111-4111-8111-111111111111')
    assert.equal(events[0]?.entityId, 'task-1')
    assert.equal(events[0]?.ipAddress, '127.0.0.1')
    assert.notInclude(String(events[0]?.userAgent), 'private@example.com')
    assert.notInclude(String(events[0]?.userAgent), 'raw-secret')
    assert.deepEqual(events[0]?.newValues, {
      method: 'POST',
      url: '/tasks/task-1',
      duration: '25ms',
      status: 204,
    })
  })

  test('does not mask a completed response when the listener rejects', async ({ assert }) => {
    const records: Array<Record<string, unknown>> = []
    const middleware = new AuditLogMiddleware({
      emit: () => Promise.reject(new Error('database password=private')),
      logger: {
        error: (_message, payload) => {
          if (payload && typeof payload === 'object') {
            records.push({ ...payload })
          }
        },
      },
      timeoutMs: 100,
    })

    await middleware.handle(context(), () => Promise.resolve())

    assert.deepEqual(records, [
      {
        failureKind: 'failed',
        errorName: 'Error',
        userId: '11111111-1111-4111-8111-111111111111',
        url: '/tasks/task-1',
      },
    ])
    assert.notInclude(JSON.stringify(records), 'private')
  })

  test('releases the response after a bounded deadline when a listener hangs', async ({
    assert,
  }) => {
    const records: Array<Record<string, unknown>> = []
    const middleware = new AuditLogMiddleware({
      emit: () => new Promise<void>(() => {}),
      logger: {
        error: (_message, payload) => {
          if (payload && typeof payload === 'object') {
            records.push({ ...payload })
          }
        },
      },
      timeoutMs: 10,
    })

    await middleware.handle(context(), () => Promise.resolve())

    assert.deepInclude(records[0], {
      failureKind: 'timed_out',
      errorName: 'AuditEmissionTimeout',
    })
  })

  test('does not mask a completed response when metadata preparation throws', async ({
    assert,
  }) => {
    let emitCalls = 0
    const records: Array<Record<string, unknown>> = []
    const params = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('hostile params')
        },
      }
    )
    const middleware = new AuditLogMiddleware({
      emit: () => {
        emitCalls += 1
        return Promise.resolve()
      },
      logger: {
        error: (_message, payload) => {
          if (payload && typeof payload === 'object') {
            records.push({ ...payload })
          }
        },
      },
      timeoutMs: 100,
    })

    await middleware.handle(context({ params }), () => Promise.resolve())

    assert.equal(emitCalls, 0)
    assert.deepInclude(records[0], {
      failureKind: 'preparation',
      errorName: 'Error',
    })
  })

  test('does not mask a completed response when failure telemetry also throws', async ({
    assert,
  }) => {
    const middleware = new AuditLogMiddleware({
      emit: () => Promise.reject(new Error('audit unavailable')),
      logger: {
        error() {
          throw new Error('telemetry unavailable')
        },
      },
      timeoutMs: 100,
    })

    await middleware.handle(context(), () => Promise.resolve())

    assert.isTrue(true)
  })

  test('preserves the downstream failure and does not emit an audit event', async ({ assert }) => {
    let emitCalls = 0
    const middleware = new AuditLogMiddleware({
      emit: () => {
        emitCalls += 1
        return Promise.resolve()
      },
      timeoutMs: 100,
    })

    await assert.rejects(
      () => middleware.handle(context(), () => Promise.reject(new Error('downstream failed'))),
      /downstream failed/
    )
    assert.equal(emitCalls, 0)
  })
})
