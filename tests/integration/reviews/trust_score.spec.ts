import { test } from '@japa/runner'

import CalculateTrustScoreCommand from '#actions/reviews/commands/calculate_trust_score_command'
import { ReviewSessionStatus } from '#constants/review_constants'
import User from '#models/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  TaskFactory,
  TaskAssignmentFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | Trust Score', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('calculate trust score command persists trust_data from completed review input', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const reviewer = await UserFactory.create({
      credibility_data: {
        credibility_score: 80,
        total_reviews_given: 0,
        accurate_reviews: 0,
        disputed_reviews: 0,
        last_calculated_at: null,
      },
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: reviewee.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: ReviewSessionStatus.COMPLETED,
      manager_review_completed: true,
      peer_reviews_count: 1,
      required_peer_reviews: 1,
    })
    const skill = await SkillFactory.create()
    await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer.id,
      reviewer_type: 'peer',
      skill_id: skill.id,
      assigned_level_code: 'senior',
    })

    const command = new CalculateTrustScoreCommand(ExecutionContext.system(reviewee.id))
    const result = await command.handle({ userId: reviewee.id })

    const updated = await User.findOrFail(reviewee.id)
    assert.isNotNull(updated.trust_data)
    assert.equal(result.userId, reviewee.id)
    assert.equal(result.tierCode, 'community')
    assert.equal(result.totalVerifiedReviews, 1)
    assert.isAtLeast(result.rawScore, 0)
    assert.isAtMost(result.rawScore, 100)
    assert.equal(updated.trust_data?.current_tier_code, 'community')
    assert.equal(updated.trust_data?.total_verified_reviews, 1)
    assert.equal(updated.trust_data?.scoring_version, 'trust_v2')
    assert.equal(updated.trust_data?.calculated_score, result.calculatedScore)
  })
})
