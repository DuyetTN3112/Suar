import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'
import MarketplaceMatchScoresController from '#modules/marketplace/controllers/marketplace-application/marketplace_match_scores_controller'

test.group('Marketplace ranking Result boundary', () => {
  test('throws expected ranking failures at the HTTP boundary', async ({ assert }) => {
    const failure = new ForbiddenException('Ranking access denied')
    const query = {
      handle: () => Promise.resolve(Result.fail(failure)),
    }
    const actions = {
      makeGetMarketplaceTaskApplicationsRankingQuery: () => query,
    } as unknown as MarketplaceActionFactory
    const controller = new MarketplaceMatchScoresController(actions)
    const ctx = {
      auth: { user: { id: 'user-1' } },
      params: { taskId: 'task-1' },
      request: {
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      session: {
        get: () => undefined,
      },
    }

    let thrown: unknown
    try {
      await controller.ranking(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
