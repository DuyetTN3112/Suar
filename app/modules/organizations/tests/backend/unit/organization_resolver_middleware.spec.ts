import { test } from '@japa/runner'

import type { OrganizationRouteAccessReader } from '#modules/organizations/access/actions/ports/inbound/organization_route_access_reader'
import OrganizationResolverMiddleware from '#modules/organizations/access/middleware/organization_resolver_middleware'

function makeContext(input: {
  transport: 'api-compat' | 'api-canonical'
  orgContextContract?: 'required' | 'optional'
}) {
  const responseState = {
    statusCode: 200,
    payload: null as unknown,
  }

  const ctx = {
    httpTransportKind: input.transport,
    route:
      input.orgContextContract === 'optional'
        ? undefined
        : {
            middleware: {
              all: () => [{ name: 'requireOrg' }],
            },
          },
    requestContext: {
      requestId: 'req_org_resolver_1',
      correlationId: 'corr_org_resolver_1',
    },
    auth: {
      isAuthenticated: true,
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        status: 'active',
        deleted_at: null,
        current_organization_id: null,
      },
      check: () => Promise.resolve(true),
    },
    request: {
      url: () => '/api/tasks',
      accepts: () => 'json',
      header: () => null,
    },
    response: {
      status(code: number) {
        responseState.statusCode = code
        return this
      },
      header() {
        return this
      },
      json(payload: unknown) {
        responseState.payload = payload
        return this
      },
    },
    session: {
      get: () => null,
      has: () => false,
      put() {},
      forget() {},
    },
  }

  return { ctx, responseState }
}

test.group('OrganizationResolverMiddleware', () => {
  const userReaderWriter = {
    findOwnerNamesByIds: () => Promise.resolve([]),
    findUserIdentity: () => Promise.resolve(null),
    findUserByEmail: () => Promise.resolve(null),
    isActiveUser: () => Promise.resolve(false),
    isSystemSuperadmin: () => Promise.resolve(false),
    updateCurrentOrganization: () => Promise.resolve(),
    loadDebugOrganizations: () =>
      Promise.resolve({
        id: 'user',
        username: null,
        currentOrganizationId: null,
        organizations: [],
      }),
  }
  const organizations = {
    findFirstApprovedMembership: () => Promise.resolve(null),
  } as unknown as OrganizationRouteAccessReader

  test('short-circuits required API requests after emitting missing-organization error', async ({
    assert,
  }) => {
    const middleware = new OrganizationResolverMiddleware(userReaderWriter, organizations)
    const { ctx, responseState } = makeContext({ transport: 'api-compat' })
    let nextCallCount = 0

    await middleware.handle(ctx as never, () => {
      nextCallCount += 1
      return Promise.resolve()
    })

    assert.equal(nextCallCount, 0)
    assert.equal(responseState.statusCode, 403)
  })

  test('allows optional API requests without organization to continue exactly once', async ({
    assert,
  }) => {
    const middleware = new OrganizationResolverMiddleware(userReaderWriter, organizations)
    const { ctx, responseState } = makeContext({
      transport: 'api-canonical',
      orgContextContract: 'optional',
    })
    let nextCallCount = 0

    await middleware.handle(ctx as never, () => {
      nextCallCount += 1
      return Promise.resolve()
    })

    assert.equal(nextCallCount, 1)
    assert.equal(responseState.statusCode, 200)
  })
})
