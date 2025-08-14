import { test } from '@japa/runner'
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
import ConfirmReviewCommand from '#actions/reviews/commands/confirm_review_command'
import { ConfirmReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
import ReviewSession from '#models/review_session'
import User from '#models/user'
import { ReviewSessionStatus } from '#constants/review_constants'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | Confirm Review', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function createCompletedSession() {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const reviewer = await UserFactory.create({
      credibility_data: {
        credibility_score: 50,
        total_reviews_given: 0,
        accurate_reviews: 0,
        disputed_reviews: 0,
        last_calculated_at: null,
      },
    })
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
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: ReviewSessionStatus.COMPLETED,
      manager_review_completed: true,
      peer_reviews_count: 2,
      required_peer_reviews: 2,
    })
    const skill = await SkillFactory.create()
    await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer.id,
      skill_id: skill.id,
      reviewer_type: 'peer',
    })

    return { reviewee, reviewer, session }
  }

  test('confirmed review writes a confirmation entry and recalculates reviewer credibility', async ({
    assert,
  }) => {
    const { reviewee, reviewer, session } = await createCompletedSession()
    const command = new ConfirmReviewCommand(ExecutionContext.system(reviewee.id))

    const confirmation = await command.handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const updatedSession = await ReviewSession.findOrFail(session.id)
    const confirmations = updatedSession.confirmations ?? []
    const savedConfirmation = confirmations[0]
    const updatedReviewer = await User.findOrFail(reviewer.id)

    assert.equal(confirmation.action, 'confirmed')
    assert.equal(confirmation.user_id, reviewee.id)
    assert.equal(updatedSession.status, ReviewSessionStatus.COMPLETED)
    assert.equal(confirmations.length, 1)
    assert.isDefined(savedConfirmation)
    if (!savedConfirmation) {
      return
    }

    assert.equal(savedConfirmation.action, 'confirmed')
    assert.equal(updatedReviewer.credibility_data?.total_reviews_given, 1)
    assert.equal(updatedReviewer.credibility_data?.accurate_reviews, 1)
    assert.equal(updatedReviewer.credibility_data?.credibility_score, 90)
  })

  test('disputed review marks the session as disputed and recalculates reviewer credibility', async ({
    assert,
  }) => {
    const { reviewee, reviewer, session } = await createCompletedSession()
    const command = new ConfirmReviewCommand(ExecutionContext.system(reviewee.id))

    await command.handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'disputed',
        dispute_reason: 'Đánh giá không chính xác',
      })
    )

    const updatedSession = await ReviewSession.findOrFail(session.id)
    const updatedReviewer = await User.findOrFail(reviewer.id)
    const confirmations = updatedSession.confirmations ?? []
    const savedConfirmation = confirmations[0]

    assert.equal(updatedSession.status, ReviewSessionStatus.DISPUTED)
    assert.equal(confirmations.length, 1)
    assert.isDefined(savedConfirmation)
    if (!savedConfirmation) {
      return
    }

    assert.equal(savedConfirmation.action, 'disputed')
    assert.equal(savedConfirmation.dispute_reason, 'Đánh giá không chính xác')
    assert.equal(updatedReviewer.credibility_data?.total_reviews_given, 1)
    assert.equal(updatedReviewer.credibility_data?.disputed_reviews, 1)
    assert.equal(updatedReviewer.credibility_data?.credibility_score, 20)
  })

  test('same reviewee cannot confirm the same session twice', async ({ assert }) => {
    const { reviewee, session } = await createCompletedSession()
    const command = new ConfirmReviewCommand(ExecutionContext.system(reviewee.id))
    const dto = new ConfirmReviewDTO({
      review_session_id: session.id,
      action: 'confirmed',
    })

    await command.handle(dto)
    await assert.rejects(() => command.handle(dto))
  })
})
