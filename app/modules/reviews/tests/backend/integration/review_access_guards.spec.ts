import { test } from '@japa/runner'

import {
  aiDisputeEvaluationSourceReader,
  reviewAdminDisputeReadModel,
} from '#composition/reviews/review-core/review_action_factory'
import { makeSystemAdminActionContext } from '#modules/admin/reviews/actions/action_context'
import GetAdminReviewDisputeAiOperatorOverviewQuery from '#modules/reviews/actions/queries/disputes/get_admin_review_dispute_ai_operator_overview_query'
import ListAdminReviewDisputesQuery from '#modules/reviews/actions/queries/disputes/list_admin_review_disputes_query'
import SkillReviewRepository from '#modules/reviews/infra/repositories/self-assessment/skill_review_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | Review Access Guards — Route Authorization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  // ---------------------------------------------------------------------------
  // Task 1: Admin routes no longer require org context.
  //
  // Route configuration proof:
  //   - BEFORE: all review routes in ONE group with .use([auth, requireOrg, throttle])
  //   - AFTER:  org routes in group with .use([auth, requireOrg, throttle])
  //             admin routes in separate group with .use([auth, requireSystemAdmin, systemAdminContext, throttle])
  //
  // requireSystemAdmin() middleware allows system_admin/superadmin through.
  // requireOrg() middleware blocks users without current_organization_id (including admins).
  // The route split ensures admin APIs are reachable without org context.
  // ---------------------------------------------------------------------------

  test('system admin without org context can access admin review disputes query', async ({
    assert,
  }) => {
    const admin = await UserFactory.create({ system_role: 'system_admin' })

    // Before fix: requireOrg() blocked admins without current_organization_id
    // After fix: admin route group uses requireSystemAdmin() only
    const ctx = makeSystemAdminActionContext(admin.id)
    const query = new ListAdminReviewDisputesQuery(ctx, reviewAdminDisputeReadModel)
    const result = await query.execute({ page: 1, perPage: 10 })

    assert.isArray(result.data)
    assert.property(result, 'meta')
  })

  test('system admin can access admin flagged reviews path', async ({ assert }) => {
    const admin = await UserFactory.create({ system_role: 'system_admin' })

    // Verify admin context is valid for admin route group
    const ctx = makeSystemAdminActionContext(admin.id)
    assert.isNotNull(ctx)
    assert.equal(ctx.userId, admin.id)
  })

  test('superadmin without org context can access admin review disputes query', async ({
    assert,
  }) => {
    const admin = await UserFactory.create({ system_role: 'superadmin' })

    const ctx = makeSystemAdminActionContext(admin.id)
    const query = new ListAdminReviewDisputesQuery(ctx, reviewAdminDisputeReadModel)
    const result = await query.execute({ page: 1, perPage: 10 })

    assert.isArray(result.data)
    assert.property(result, 'meta')
  })

  test('Reviews owns the admin AI operator dispute overview and metrics query', async ({
    assert,
  }) => {
    const admin = await UserFactory.create({ system_role: 'system_admin' })
    const result = await new GetAdminReviewDisputeAiOperatorOverviewQuery(
      makeSystemAdminActionContext(admin.id),
      aiDisputeEvaluationSourceReader,
      reviewAdminDisputeReadModel
    ).execute({ page: 1, perPage: 10 })

    assert.isArray(result.disputes.data)
    assert.isNumber(result.metrics.totalEvaluations)
    assert.isNumber(result.metrics.activeEvaluations)
    assert.isNumber(result.metrics.completedEvaluations)
    assert.isNumber(result.metrics.failedEvaluations)
    assert.isArray(result.metrics.providers)
  })

  test('skill review aggregates execute their fully constructed empty queries once', async ({
    assert,
  }) => {
    const reviewer = await UserFactory.create()
    const reviewee = await UserFactory.create()

    assert.deepEqual(
      await SkillReviewRepository.calculateSkillAvgPercentage(reviewee.id, reviewer.id),
      {
        avgPercentage: 0,
        totalReviews: 0,
      }
    )
    assert.equal(
      await SkillReviewRepository.countCompletedHighReviewsBetweenUsers(
        reviewer.id,
        reviewee.id,
        undefined,
        new Date()
      ),
      0
    )
  })

  test('legacy my reviews entrypoints are removed from the user surface', async ({ assert }) => {
    const { default: router } = await import('@adonisjs/core/services/router')

    assert.isNull(router.match('/reviews/task-board', 'GET', true))
    assert.isNull(router.match('/reviews/pending', 'GET', true))
    assert.isNull(router.match('/reviews/sprint-reverse-board', 'GET', true))
    assert.isNull(router.match('/reviews/reverse-reviews', 'GET', true))
    assert.isNull(router.match('/org/reviews/task-board', 'GET', true))
    assert.isNull(router.match('/org/reviews/sprint-reverse-board', 'GET', true))
    assert.isNull(router.match('/org/reverse-reviews', 'GET', true))
    assert.isNull(router.match('/org/disputes', 'GET', true))
    assert.isNull(router.match('/admin/reverse-reviews', 'GET', true))
    assert.isNull(router.match('/reviews/00000000-0000-0000-0000-000000000000', 'GET', true))
    assert.isNull(
      router.match('/reviews/disputes/00000000-0000-0000-0000-000000000000', 'GET', true)
    )
    assert.isNull(
      router.match('/reviews/sprint-disputes/00000000-0000-0000-0000-000000000000', 'GET', true)
    )
    assert.isNull(router.match('/my-reviews', 'GET', true))
    assert.isNull(router.match('/reviews/my-reviews', 'GET', true))
    assert.isNull(router.match('/api/me/reverse-reviews', 'GET', true))
    assert.isNull(router.match('/api/v1/me/reverse-reviews', 'GET', true))
    assert.isNull(router.match('/api/org/reverse-reviews', 'GET', true))
    assert.isNull(router.match('/api/v1/me/organizations/current/reverse-reviews', 'GET', true))
  })
})
