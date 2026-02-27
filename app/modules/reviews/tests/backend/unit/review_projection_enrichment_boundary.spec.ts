import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

const readSource = (path: string) => readFile(join(process.cwd(), path), 'utf8')

test.group('Review projection enrichment boundary', () => {
  test('projection queries and pending composition have no default dependency locator', async ({
    assert,
  }) => {
    const sources = await Promise.all(
      [
        'app/modules/reviews/actions/queries/get_review_session_query.ts',
        'app/modules/reviews/actions/queries/get_user_reviews_query.ts',
        'app/modules/reviews/actions/queries/get_flagged_reviews_query.ts',
        'app/composition/review_pending_query_composition.ts',
      ].map(readSource)
    )

    for (const source of sources) {
      assert.notInclude(source, 'DefaultReviewDependencies')
      assert.notInclude(source, 'review_external_dependencies_impl')
    }
  })

  test('Admin moderation uses its runtime gateway without an infra singleton', async ({
    assert,
  }) => {
    const gatewayPort = await readSource(
      'app/modules/admin/reviews/actions/ports/outbound/review_moderation_gateway.ts'
    )
    const gatewayAdapter = await readSource(
      'app/composition/adapters/reviews_admin_moderation_gateway_adapter.ts'
    )
    const actions = await Promise.all(
      [
        'app/modules/admin/dashboard/actions/query/get_dashboard_stats_query.ts',
        'app/modules/admin/reviews/actions/query/get_flagged_review_detail_query.ts',
        'app/modules/admin/reviews/actions/query/list_flagged_reviews_query.ts',
        'app/modules/admin/reviews/actions/command/resolve_flagged_review_command.ts',
      ].map(readSource)
    )

    assert.include(gatewayPort, 'export abstract class ReviewModerationGateway')
    assert.include(gatewayAdapter, 'ReviewsAdminModerationGatewayAdapter')
    for (const source of actions) {
      assert.notInclude(source, 'review_public_api_moderation_gateway')
    }
  })

  test('outer provider binds all three narrow enrichment readers', async ({ assert }) => {
    const provider = await readSource('app/composition/review_consumer_ports_provider.ts')

    assert.include(provider, 'ReviewAssignmentProjectionReader')
    assert.include(provider, 'ReviewModeratorIdentityProjectionReader')
    assert.include(provider, 'ReviewSkillIdentityReader')
    assert.include(provider, 'ReviewModerationGateway')
  })
})
