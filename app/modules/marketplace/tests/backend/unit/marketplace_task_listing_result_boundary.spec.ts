import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { GetMarketplaceTasksPageQuery } from '#modules/marketplace/actions/queries/marketplace-application/get_marketplace_tasks_page_query'
import { GetMarketplaceTasksQuery } from '#modules/marketplace/actions/queries/marketplace-application/get_marketplace_tasks_query'

test.group('Marketplace task listing Result boundary', () => {
  test('public task listing preserves expected application failures', async ({ assert }) => {
    const failure = new ForbiddenException('Task listing unavailable')
    const query = new GetMarketplaceTasksQuery(
      { list: () => Promise.reject(failure) },
      { canUseRecommendedTaskSort: () => Promise.resolve(false) },
      { userId: null, organizationId: null, ip: '127.0.0.1', userAgent: 'test' }
    )

    const result = await query.executeAndWrap({})

    assert.isFalse(result.isSuccess())
    assert.strictEqual(result.getError(), failure)
  })

  test('task listing page preserves nested query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Task listing unavailable')
    const query = new GetMarketplaceTasksPageQuery(
      {
        handle: () => Promise.reject(failure),
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      },
      { listActive: () => Promise.resolve([]) }
    )

    const result = await query.executeAndWrap({})

    assert.isFalse(result.isSuccess())
    assert.strictEqual(result.getError(), failure)
  })
})
