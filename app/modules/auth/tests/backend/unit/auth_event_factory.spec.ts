import { test } from '@japa/runner'

import { buildAuthLoginEvent } from '#modules/auth/observability/auth_event_factory'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/contracts/platform_event_names'

test.group('Unit | Auth Event Factory', () => {
  test('builds social login event with provider target and request trace', ({ assert }) => {
    const event = buildAuthLoginEvent(
      {
        userId: null,
        ip: '127.0.0.1',
        userAgent: 'unit-test',
        organizationId: null,
        requestId: 'req-1',
        traceId: 'trace-1',
        workflowId: null,
      },
      {
        eventName: PLATFORM_EVENT_NAMES.AUTH_LOGIN_COMPLETED,
        stage: 'completed',
        outcome: 'success',
        provider: 'google',
        userId: 'user-1',
        organizationId: 'org-1',
        change: {
          redirect_to: '/dashboard',
        },
      }
    )

    assert.equal(event.module, 'auth')
    assert.equal(event.workflow, 'auth_social_login')
    assert.equal(event.target?.type, 'auth_provider')
    assert.equal(event.target?.id, 'google')
    assert.equal(event.actor.user_id, 'user-1')
    assert.equal(event.request?.id, 'req-1')
    assert.equal(event.trace.id, 'trace-1')
  })
})
