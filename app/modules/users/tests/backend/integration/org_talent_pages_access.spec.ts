import { test } from '@japa/runner'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ListOrgReviewDisputesQuery from '#modules/reviews/actions/queries/list_org_review_disputes_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Org Talent Pages Access', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('query with no current organization context throws ForbiddenException', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = makeSystemReviewActionContext(user.id) // organizationId is null

    const query = new ListOrgReviewDisputesQuery(ctx)
    await assert.rejects(
      () => query.execute({ page: 1, perPage: 10 }),
      ForbiddenException
    )
  })

  test('query with unauthenticated context throws UnauthorizedException', async ({ assert }) => {
    const ctx = {
      userId: null,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: 'some-org-id',
    }

    const query = new ListOrgReviewDisputesQuery(ctx)
    await assert.rejects(
      () => query.execute({ page: 1, perPage: 10 }),
      UnauthorizedException
    )
  })
})
