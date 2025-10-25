import { test } from '@japa/runner'

import {
  requireCurrentOrganizationId,
  resolveCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'

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
})
