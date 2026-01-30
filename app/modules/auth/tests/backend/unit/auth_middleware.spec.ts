import { test } from '@japa/runner'

import type { AuthSessionIdentityReader } from '#modules/auth/actions/ports/outbound/auth_session_identity_reader'
import type { AuthSessionTokenStore } from '#modules/auth/actions/ports/outbound/auth_session_token_store'
import type { AuthWebSessionUserReader } from '#modules/auth/actions/ports/outbound/auth_web_session_user_reader'
import { VerifySessionAccessTokenQuery } from '#modules/auth/actions/queries/verify_session_access_token_query'
import AuthMiddleware from '#modules/auth/middleware/auth_middleware'

const unusedStore: AuthSessionTokenStore = {
  issue: () => Promise.reject(new Error('Session token store must not be used')),
  readAccess: () => Promise.resolve(null),
  readRefresh: () => Promise.resolve(null),
  rotate: () => Promise.reject(new Error('Session token store must not be used')),
  revokeAccess: () => Promise.reject(new Error('Session token store must not be used')),
  revokeRefresh: () => Promise.reject(new Error('Session token store must not be used')),
}

const missingIdentityReader: AuthSessionIdentityReader = {
  findById: () => Promise.resolve(null),
}

const missingWebSessionUserReader: AuthWebSessionUserReader = {
  findById: () => Promise.resolve(null),
}

const missingOrganizationMembership = {
  findApprovedRole: () => Promise.resolve(null),
}
const noSystemAccess = {
  canAccessSystemAdministration: () => Promise.resolve(false),
}

function makeMiddleware(): AuthMiddleware {
  return new AuthMiddleware(
    new VerifySessionAccessTokenQuery(
      unusedStore,
      missingIdentityReader,
      missingOrganizationMembership,
      noSystemAccess
    ),
    missingWebSessionUserReader
  )
}

function makeAuthenticatedContext() {
  const webGuard = {
    authenticationAttempted: false,
    isAuthenticated: true,
    user: undefined as unknown,
  }
  const user = {
    deleted_at: null,
    status: 'active',
    load: async () => {},
  }

  return {
    httpTransportKind: 'page',
    requestContext: {
      requestId: 'req_auth_1',
      correlationId: 'corr_auth_1',
    },
    auth: {
      user,
      use: () => webGuard,
      authenticateUsing: async () => {},
    },
    request: {
      url: () => '/projects',
      header: () => null,
      accepts: () => 'html',
    },
    response: {
      redirect: () => ({
        toPath() {},
      }),
    },
    session: {
      put() {},
      flash() {},
      get: () => null,
    },
    inertia: {
      location() {},
    },
  }
}

test.group('AuthMiddleware', () => {
  test('calls downstream exactly once on an authenticated request', async ({ assert }) => {
    const middleware = makeMiddleware()
    const ctx = makeAuthenticatedContext()
    let nextCallCount = 0

    await middleware.handle(ctx as never, () => {
      nextCallCount += 1
      return Promise.resolve()
    })

    assert.equal(nextCallCount, 1)
  })

  test('propagates downstream failures without retrying or redirecting', async ({ assert }) => {
    const middleware = makeMiddleware()
    const ctx = makeAuthenticatedContext()
    const downstreamError = new Error('downstream mutation failed')
    let nextCallCount = 0

    await assert.rejects(
      () =>
        middleware.handle(ctx as never, () => {
          nextCallCount += 1
          return Promise.reject(downstreamError)
        }),
      'downstream mutation failed'
    )

    assert.equal(nextCallCount, 1)
  })

  test('propagates authentication infrastructure failures instead of treating them as logout', async ({
    assert,
  }) => {
    const middleware = makeMiddleware()
    const ctx = makeAuthenticatedContext()
    ctx.auth.authenticateUsing = () => Promise.reject(new Error('session database unavailable'))

    await assert.rejects(
      () => middleware.handle(ctx as never, () => Promise.resolve()),
      /session database unavailable/
    )
  })

  test('rejects an authenticated inactive account before downstream SSE-capable routes', async ({
    assert,
  }) => {
    const middleware = makeMiddleware()
    const ctx = makeAuthenticatedContext()
    const user = ctx.auth.user as { status: string }
    user.status = 'inactive'
    let nextCallCount = 0

    await middleware.handle(ctx as never, () => {
      nextCallCount += 1
      return Promise.resolve()
    })

    assert.equal(nextCallCount, 0)
  })
})
