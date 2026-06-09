import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'
import MyMarketplaceApplicationsController from '#modules/marketplace/controllers/marketplace-application/my_marketplace_applications_controller'

test.group('My marketplace applications Result boundary', () => {
  test('throws expected query failures at the HTTP boundary', async ({ assert }) => {
    const failure = new UnauthorizedException('Authentication required')
    const query = {
      handle: () => Promise.resolve(Result.fail(failure)),
    }
    const actions = {
      makeGetMyMarketplaceApplicationsQuery: () => query,
    } as unknown as MarketplaceActionFactory
    const controller = new MyMarketplaceApplicationsController(actions)
    const ctx = {
      auth: { user: { id: 'user-1' } },
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
