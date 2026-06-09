import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'
import ListOrganizationMarketplaceApplicationsController from '#modules/marketplace/controllers/marketplace-application/list_organization_marketplace_applications_controller'

test.group('Organization marketplace applications Result boundary', () => {
  test('throws expected query failures at the HTTP boundary', async ({ assert }) => {
    const failure = new ForbiddenException('Organization access denied')
    const query = {
      handle: () => Promise.resolve(Result.fail(failure)),
    }
    const actions = {
      makeGetMarketplaceOrganizationApplicationsQuery: () => query,
    } as unknown as MarketplaceActionFactory
    const controller = new ListOrganizationMarketplaceApplicationsController(actions)
    const ctx = {
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      currentOrganizationRole: 'org_admin',
      request: {
        input: (_key: string, fallback?: unknown) => fallback,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      session: {
        get: () => undefined,
      },
      inertia: {
        render: () => Promise.reject(new Error('controller must unwrap Result first')),
      },
      response: {
        status: () => {},
      },
    }

    let thrown: unknown
    try {
      await controller.handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
