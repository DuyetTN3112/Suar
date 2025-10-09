import { test } from '@japa/runner'

import RequireSystemAdminMiddleware from '#modules/authorization/middleware/require_system_admin_middleware'

test.group('RequireSystemAdminMiddleware', () => {
  test('returns compat API error for unauthenticated JSON request', async ({
    assert,
  }) => {
    const middleware = new RequireSystemAdminMiddleware()
    const responseState = {
      statusCode: 200,
      payload: null as unknown,
    }

    const ctx = {
      requestContext: {
        requestId: 'req_admin_1',
        correlationId: 'corr_admin_1',
      },
      auth: {
        user: null,
      },
      request: {
        accepts: () => 'json',
        url: () => '/api/admin/users',
        header: () => null,
      },
      response: {
        status(code: number) {
          responseState.statusCode = code
          return this
        },
        json(payload: unknown) {
          responseState.payload = payload
          return this
        },
        redirect() {
          return {
            toRoute() {},
          }
        },
      },
      session: {
        flash() {},
      },
    }

    let nextCalled = false
    await middleware.handle(ctx as never, () => {
      nextCalled = true
      return Promise.resolve()
    })

    assert.isFalse(nextCalled)
    assert.equal(responseState.statusCode, 401)
    assert.deepEqual(responseState.payload, {
      success: false,
      error: {
        code: 'E_UNAUTHORIZED',
        message: 'You must be logged in to access this page',
      },
      meta: {
        request_id: 'req_admin_1',
        correlation_id: 'corr_admin_1',
      },
    })
  })
})
