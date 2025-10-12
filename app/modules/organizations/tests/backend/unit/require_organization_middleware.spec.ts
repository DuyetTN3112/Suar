import { test } from '@japa/runner'

import RequireOrganizationMiddleware from '#modules/organizations/middleware/require_organization_middleware'

test.group('RequireOrganizationMiddleware', () => {
  test('returns compat API error for authenticated JSON request without organization', async ({
    assert,
  }) => {
    const middleware = new RequireOrganizationMiddleware()
    const responseState = {
      statusCode: 200,
      payload: null as unknown,
    }

    const ctx = {
      currentOrganizationId: undefined,
      requestContext: {
        requestId: 'req_org_1',
        correlationId: 'corr_org_1',
      },
      auth: {
        isAuthenticated: true,
        user: {
          current_organization_id: null,
          system_role: 'org_member',
        },
      },
      request: {
        accepts: () => 'json',
        header: () => null,
        url: (includeQuery?: boolean) =>
          includeQuery ? '/api/tasks/123' : '/api/tasks/123',
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
      },
      session: {
        get: () => null,
        put() {},
      },
    }

    let nextCalled = false
    await middleware.handle(ctx as never, () => {
      nextCalled = true
      return Promise.resolve()
    })

    assert.isFalse(nextCalled)
      assert.equal(responseState.statusCode, 403)
    assert.deepEqual(responseState.payload, {
      success: false,
      error: {
          code: 'E_FORBIDDEN',
        message: 'Vui lòng chọn organization',
      },
      meta: {
        request_id: 'req_org_1',
        correlation_id: 'corr_org_1',
      },
      redirectTo: '/organizations',
    })
  })

  test('returns compat API error for system admin JSON request without workspace', async ({
    assert,
  }) => {
    const middleware = new RequireOrganizationMiddleware()
    const responseState = {
      statusCode: 200,
      payload: null as unknown,
    }

    const ctx = {
      currentOrganizationId: undefined,
      requestContext: {
        requestId: 'req_org_2',
        correlationId: 'corr_org_2',
      },
      auth: {
        isAuthenticated: true,
        user: {
          current_organization_id: null,
          system_role: 'system_admin',
        },
      },
      request: {
        accepts: () => 'json',
        header: () => null,
        url: (includeQuery?: boolean) =>
          includeQuery ? '/api/tasks/123' : '/api/tasks/123',
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
        redirect(_path: string) {},
      },
      session: {
        get: () => null,
        put() {},
      },
    }

    let nextCalled = false
    await middleware.handle(ctx as never, () => {
      nextCalled = true
      return Promise.resolve()
    })

    assert.isFalse(nextCalled)
    assert.equal(responseState.statusCode, 403)
    assert.deepEqual(responseState.payload, {
      success: false,
      error: {
        code: 'E_FORBIDDEN',
        message: 'System admin workspace required',
      },
      meta: {
        request_id: 'req_org_2',
        correlation_id: 'corr_org_2',
      },
      redirectTo: '/admin',
    })
  })
})
