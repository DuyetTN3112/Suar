import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import GetFlaggedReviewsQuery from '#modules/reviews/actions/queries/get_flagged_reviews_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  FlaggedReviewFactory,
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Flagged Reviews Cursor Pagination', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns older flagged review windows without overlapping first window', async ({
    assert,
  }) => {
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
    const baseTime = DateTime.fromISO('2026-07-05T12:00:00.000Z')
    const createdFlagIds: string[] = []

    for (let index = 0; index < 4; index++) {
      const skillReview = await SkillReviewFactory.create({
        review_session_id: reviewSession.id,
        reviewer_id: reviewer.id,
        reviewer_type: 'peer',
        skill_id: skill.id,
        comment: `flagged-comment-${index}`,
      })
      const flagged = await FlaggedReviewFactory.create({
        skill_review_id: skillReview.id,
        flag_type: 'bulk_same_level',
        severity: 'high',
        status: 'pending',
      })

      flagged.detected_at = baseTime.minus({ minutes: index })
      await flagged.save()
      createdFlagIds.push(flagged.id)
    }

    const query = new GetFlaggedReviewsQuery(makeSystemReviewActionContext(superadmin.id))
    const firstWindow = await query.handle({
      page: 1,
      per_page: 2,
      status: 'pending',
    })

    assert.lengthOf(firstWindow.data, 2)
    assert.deepEqual(
      firstWindow.data.map((item) => item.id),
      createdFlagIds.slice(0, 2)
    )
    assert.isTrue(firstWindow.meta.cursor.has_next_page)
    assert.isFalse(firstWindow.meta.cursor.has_previous_page)
    assert.isString(firstWindow.meta.cursor.next_cursor)

    const nextCursor = firstWindow.meta.cursor.next_cursor
    if (nextCursor === null) {
      throw new Error('Expected next cursor')
    }
    const secondWindow = await query.handle({
      page: 1,
      per_page: 2,
      status: 'pending',
      after: nextCursor,
    })

    assert.lengthOf(secondWindow.data, 2)
    assert.deepEqual(
      secondWindow.data.map((item) => item.id),
      createdFlagIds.slice(2, 4)
    )
    assert.isTrue(secondWindow.meta.cursor.has_previous_page)
    assert.isFalse(secondWindow.meta.cursor.has_next_page)
    assert.equal(
      secondWindow.data.filter((item) => firstWindow.data.some((first) => first.id === item.id))
        .length,
      0
    )

    const previousCursor = secondWindow.meta.cursor.previous_cursor
    if (previousCursor === null) {
      throw new Error('Expected previous cursor')
    }
    const newerWindow = await query.handle({
      page: 1,
      per_page: 2,
      status: 'pending',
      before: previousCursor,
    })

    assert.deepEqual(
      newerWindow.data.map((item) => item.id),
      createdFlagIds.slice(0, 2)
    )
    assert.isFalse(newerWindow.meta.cursor.has_previous_page)
    assert.isTrue(newerWindow.meta.cursor.has_next_page)
  })
})
