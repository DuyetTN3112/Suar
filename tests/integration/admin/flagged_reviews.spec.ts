import { test } from '@japa/runner'

import ResolveFlaggedReviewCommand from '#actions/admin/reviews/commands/resolve_flagged_review_command'
import ListFlaggedReviewsQuery from '#actions/admin/reviews/queries/list_flagged_reviews_query'
import FlaggedReview from '#models/flagged_review'
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
import { ExecutionContext } from '#types/execution_context'

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

    const result = await new ListFlaggedReviewsQuery(ExecutionContext.system(superadmin.id)).handle(
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

    await new ResolveFlaggedReviewCommand(ExecutionContext.system(superadmin.id)).handle({
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
})
