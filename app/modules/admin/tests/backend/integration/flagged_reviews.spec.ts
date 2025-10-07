import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { makeSystemAdminActionContext } from '#modules/admin/actions/admin_action_context'
import ResolveFlaggedReviewCommand from '#modules/admin/actions/reviews/commands/resolve_flagged_review_command'
import ListFlaggedReviewsQuery from '#modules/admin/actions/reviews/queries/list_flagged_reviews_query'
import FlaggedReview from '#modules/reviews/infra/models/flagged_review'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  TaskFactory,
  TaskAssignmentFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  FlaggedReviewFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

test.group('Integration | Admin Flagged Reviews', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function createFlaggedReviewScenario() {
    const superadmin = await UserFactory.createSuperadmin()
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const reviewer = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const reviewSession = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
      manager_review_completed: true,
      peer_reviews_count: 1,
      required_peer_reviews: 1,
    })
    const skill = await SkillFactory.create()
    const skillReview = await SkillReviewFactory.create({
      review_session_id: reviewSession.id,
      reviewer_id: reviewer.id,
      reviewer_type: 'peer',
      skill_id: skill.id,
      comment: 'Same score pattern on every review',
    })
    const flaggedReview = await FlaggedReviewFactory.create({
      skill_review_id: skillReview.id,
      flag_type: 'bulk_same_level',
      severity: 'high',
      status: 'pending',
    })

    return { superadmin, reviewer, reviewee, flaggedReview }
  }

  test('lists flagged reviews with reviewer and reviewee info', async ({ assert }) => {
    const { superadmin, reviewer, reviewee, flaggedReview } = await createFlaggedReviewScenario()

    const result = await new ListFlaggedReviewsQuery(makeSystemAdminActionContext(superadmin.id)).handle(
      {
        page: 1,
        perPage: 50,
      }
    )

    const item = result.data.find((review) => review.id === flaggedReview.id)
    assert.isDefined(item)
    assert.equal(item?.reviewer?.id, reviewer.id)
    assert.equal(item?.reviewee?.id, reviewee.id)
    assert.equal(item?.flag_type, 'bulk_same_level')
    assert.equal(item?.severity, 'high')
    assert.equal(item?.status, 'pending')
    assert.equal(item?.comment, 'Same score pattern on every review')
  })

  test('resolving flagged review stores reviewed_by and final status', async ({ assert }) => {
    const { superadmin, flaggedReview } = await createFlaggedReviewScenario()

    await new ResolveFlaggedReviewCommand(makeSystemAdminActionContext(superadmin.id)).handle({
      flaggedReviewId: flaggedReview.id,
      action: 'dismiss',
      notes: 'False positive after manual review',
    })

    const refreshed = await FlaggedReview.findOrFail(flaggedReview.id)
    assert.equal(refreshed.status, 'dismissed')
    assert.equal(refreshed.reviewed_by, superadmin.id)
    assert.equal(refreshed.notes, 'False positive after manual review')
    assert.isNotNull(refreshed.reviewed_at)
  })

  test('preserves legacy admin filters on shared pagination repository', async ({ assert }) => {
    const { superadmin, reviewer } = await createFlaggedReviewScenario()
    const { flaggedReview: dismissedReview } = await createFlaggedReviewScenario()
    dismissedReview.status = 'dismissed'
    dismissedReview.flag_type = 'new_account_high'
    dismissedReview.severity = 'medium'
    dismissedReview.detected_at = DateTime.fromISO('2026-07-05T17:55:00.000Z')
    await dismissedReview.save()

    const result = await new ListFlaggedReviewsQuery(makeSystemAdminActionContext(superadmin.id)).handle(
      {
        page: 1,
        perPage: 50,
        search: reviewer.username,
        flagType: 'bulk_same_level',
        severity: 'high',
        status: 'pending',
      }
    )

    assert.lengthOf(result.data, 1)
    assert.equal(result.data[0]?.reviewer?.username, reviewer.username)
    assert.equal(result.data[0]?.flag_type, 'bulk_same_level')
    assert.equal(result.data[0]?.severity, 'high')
    assert.equal(result.data[0]?.status, 'pending')
  })

  test('supports bidirectional cursor pagination for admin moderation queue', async ({ assert }) => {
    const { superadmin, flaggedReview } = await createFlaggedReviewScenario()
    const baseTime = DateTime.fromISO('2026-07-05T18:00:00.000Z')

    const extraIds = [flaggedReview.id]
    for (let index = 0; index < 3; index++) {
      const { flaggedReview: extra } = await createFlaggedReviewScenario()
      extraIds.push(extra.id)
    }

    for (const [index, flaggedId] of extraIds.entries()) {
      const review = await FlaggedReview.findOrFail(flaggedId)
      review.detected_at = baseTime.minus({ minutes: index })
      await review.save()
    }

    const query = new ListFlaggedReviewsQuery(makeSystemAdminActionContext(superadmin.id))
    const firstWindow = await query.handle({ page: 1, perPage: 2, status: 'pending' })

    assert.lengthOf(firstWindow.data, 2)
    assert.isTrue(firstWindow.meta.cursor.hasNextPage)
    assert.isFalse(firstWindow.meta.cursor.hasPreviousPage)

    const secondWindow = await query.handle({
      page: 1,
      perPage: 2,
      status: 'pending',
      after: firstWindow.meta.cursor.nextCursor,
    })

    assert.lengthOf(secondWindow.data, 2)
    assert.isTrue(secondWindow.meta.cursor.hasPreviousPage)
    assert.isFalse(secondWindow.meta.cursor.hasNextPage)
    assert.equal(
      secondWindow.data.filter((item) => firstWindow.data.some((first) => first.id === item.id))
        .length,
      0
    )

    const newerWindow = await query.handle({
      page: 1,
      perPage: 2,
      status: 'pending',
      before: secondWindow.meta.cursor.previousCursor,
    })

    assert.deepEqual(
      newerWindow.data.map((item) => item.id),
      firstWindow.data.map((item) => item.id)
    )
  })
})
