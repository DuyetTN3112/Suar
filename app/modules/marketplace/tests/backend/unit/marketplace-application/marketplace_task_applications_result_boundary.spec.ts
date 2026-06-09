import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'
import ListMarketplaceTaskApplicationsController from '#modules/marketplace/controllers/marketplace-application/list_marketplace_task_applications_controller'

test.group('Marketplace task applications Result boundary', () => {
  test('throws expected query failures at the HTTP boundary', async ({ assert }) => {
    const failure = new NotFoundException('Task not found')
    const query = {
      handle: () => Promise.resolve(Result.fail(failure)),
    }
    const actions = {
      makeGetMarketplaceTaskApplicationsQuery: () => query,
    } as unknown as MarketplaceActionFactory
    const controller = new ListMarketplaceTaskApplicationsController(actions)
    const ctx = {
      auth: { user: { id: 'user-1' } },
      params: { taskId: 'task-1' },
      session: {
        get: () => undefined,
      },
      request: {
        input: (_key: string, fallback?: unknown) => fallback,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
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
