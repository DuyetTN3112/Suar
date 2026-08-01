import { test } from '@japa/runner'

import {
  handleAuditLogEvent,
  type AuditLogListenerDependencies,
} from '#modules/audit/listeners/audit_log_listener'

test.group('Audit log listener failure semantics', () => {
  test('bounds and redacts generic event data before persistence', async ({ assert }) => {
    const events: unknown[] = []
    await handleAuditLogEvent(
      {
        userId: '11111111-1111-4111-8111-111111111111',
        action: 'security_action',
        entityType: 'user',
        entityId: '22222222-2222-4222-8222-222222222222',
        userAgent: 'private@example.com token=raw-secret',
        newValues: {
          password: 'raw-password',
          email: 'private@example.com',
          safe: 'visible',
        },
      },
      {
        write: (event) => {
          events.push(event)
          return Promise.resolve()
        },
        logger: {
          error() {},
        },
      }
    )

    assert.lengthOf(events, 1)
    const persisted = JSON.stringify(events[0])
    assert.notInclude(persisted, 'raw-secret')
    assert.notInclude(persisted, 'raw-password')
    assert.notInclude(persisted, 'private@example.com')
    assert.include(persisted, '[REDACTED]')
    assert.include(persisted, '[REDACTED_EMAIL]')
    assert.deepInclude(events[0], {
      redactionApplied: true,
    })
  })

  test('propagates persistence failure and emits only bounded diagnostics', async ({
    assert,
  }) => {
    const observations: Record<string, unknown>[] = []
    const failure = new Error('audit database failed password=private')
    const dependencies: AuditLogListenerDependencies = {
      write: () => Promise.reject(failure),
      logger: {
        error: (_message, context) => {
          if (context && typeof context === 'object' && !Array.isArray(context)) {
            observations.push({ ...context })
          }
        },
      },
    }

    await assert.rejects(
      () =>
        handleAuditLogEvent(
          {
            userId: 'user-1',
            action: 'security_action',
          },
          dependencies
        ),
      /audit database failed/
    )

    assert.deepEqual(observations, [
      {
        userId: 'user-1',
        action: 'security_action',
        errorName: 'Error',
      },
    ])
    assert.notInclude(JSON.stringify(observations), 'private')
  })
})
