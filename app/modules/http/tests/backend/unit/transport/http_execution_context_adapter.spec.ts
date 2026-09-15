import { test } from '@japa/runner'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
  resolveCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'

function makeContext(input: {
  currentOrganizationId?: string | undefined
  sessionOrganizationId?: string | undefined
  userOrganizationId?: string | null | undefined
}) {
  return {
    currentOrganizationId: input.currentOrganizationId,
    session: {
      get: (key: string) => {
        if (key === 'current_organization_id') {
          return input.sessionOrganizationId
        }

        return undefined
      },
    },
    auth: {
      user:
        input.userOrganizationId === undefined
          ? undefined
          : {
              current_organization_id: input.userOrganizationId,
            },
    },
  }
}

test.group('HTTP execution context adapter', () => {
  test('prefers router-resolved organization context over session and user fallback', ({
    assert,
  }) => {
    const ctx = makeContext({
      currentOrganizationId: 'org-router',
      sessionOrganizationId: 'org-session',
      userOrganizationId: 'org-user',
    })

    assert.equal(resolveCurrentOrganizationId(ctx as never), 'org-router')
  })

  test('falls back to session organization when router context is missing', ({ assert }) => {
    const ctx = makeContext({
      sessionOrganizationId: 'org-session',
      userOrganizationId: 'org-user',
    })

    assert.equal(resolveCurrentOrganizationId(ctx as never), 'org-session')
  })

  test('falls back to authenticated user current organization when session is missing', ({
    assert,
  }) => {
    const ctx = makeContext({
      userOrganizationId: 'org-user',
    })

    assert.equal(resolveCurrentOrganizationId(ctx as never), 'org-user')
  })

  test('throws canonical business error when organization context is required but absent', ({
    assert,
  }) => {
    const ctx = makeContext({})

    assert.throws(() => requireCurrentOrganizationId(ctx as never), 'Vui lòng chọn organization')
  })

  test('uses the server request context instead of untrusted inbound id headers', ({ assert }) => {
    const ctx = {
      ...makeContext({
        currentOrganizationId: 'org-router',
        userOrganizationId: 'org-user',
      }),
      currentOrganizationRole: 'admin',
      requestContext: {
        requestId: 'server-request-id',
        correlationId: 'server-correlation-id',
        traceId: '0123456789abcdef0123456789abcdef',
      },
      auth: {
        user: {
          id: 'user-1',
          current_organization_id: 'org-user',
        },
      },
      request: {
        ip: () => '127.0.0.1',
        header: (name: string) => {
          if (name === 'x-request-id') return 'attacker-controlled-request-id'
          if (name === 'x-trace-id') return 'attacker-controlled-trace-id'
          if (name === 'user-agent') return 'test-agent'
          return undefined
        },
      },
    }

    const result = actionContextFromHttp(ctx as never)

    assert.equal(result.requestId, 'server-request-id')
    assert.equal(result.traceId, '0123456789abcdef0123456789abcdef')
    assert.equal(result.actorRoleSurface, 'admin')
  })
})
