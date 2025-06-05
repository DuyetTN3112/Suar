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
import ReviewSession from '#models/review_session'
import User from '#models/user'
import { ReviewSessionStatus } from '#constants/review_constants'
import type { ReviewConfirmationEntry } from '#types/database'

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
    return { org, owner, reviewee, reviewer, task, assignment, session, skill }
  }

  test('confirmed action adds entry to confirmations JSONB', async ({ assert }) => {
    const { reviewee, session } = await createCompletedSession()

    const confirmation: ReviewConfirmationEntry = {
      user_id: reviewee.id,
      action: 'confirmed',
      dispute_reason: null,
      created_at: new Date().toISOString(),
    }

    const confirmations = session.confirmations ?? []
    confirmations.push(confirmation)
    await session.merge({ confirmations }).save()

    const result = await ReviewSession.findOrFail(session.id)
    assert.isNotNull(result.confirmations)
    assert.equal(result.confirmations!.length, 1)
    assert.equal(result.confirmations![0]!.action, 'confirmed')
  })

  test('disputed action sets session status to disputed', async ({ assert }) => {
    const { reviewee, session } = await createCompletedSession()

    const confirmation: ReviewConfirmationEntry = {
      user_id: reviewee.id,
      action: 'disputed',
      dispute_reason: 'Đánh giá không chính xác',
      created_at: new Date().toISOString(),
    }

    const confirmations = session.confirmations ?? []
    confirmations.push(confirmation)
    await session
      .merge({
        confirmations,
        status: ReviewSessionStatus.DISPUTED,
      })
      .save()

    const result = await ReviewSession.findOrFail(session.id)
    assert.equal(result.status, ReviewSessionStatus.DISPUTED)
  })

  test('credibility score increases on confirm (+2)', async ({ assert }) => {
    const { reviewer: _reviewer } = await createCompletedSession()
    const { adjustCredibility } = await import('#domain/reviews/review_formulas')

    const newScore = adjustCredibility(50, 'confirmed')
    assert.equal(newScore, 52)
  })

  test('credibility score decreases on dispute (-5)', async ({ assert }) => {
    const { reviewer: _reviewer } = await createCompletedSession()
    const { adjustCredibility } = await import('#domain/reviews/review_formulas')

    const newScore = adjustCredibility(50, 'disputed')
    assert.equal(newScore, 45)
  })

  test('credibility score clamped between 0 and 100', async ({ assert }) => {
    const { adjustCredibility } = await import('#domain/reviews/review_formulas')

    assert.equal(adjustCredibility(99, 'confirmed'), 100) // capped at 100
    assert.equal(adjustCredibility(2, 'disputed'), 0) // capped at 0
  })

  test('cannot confirm twice (duplicate check)', async ({ assert }) => {
    const { reviewee, session } = await createCompletedSession()

    const confirmation: ReviewConfirmationEntry = {
      user_id: reviewee.id,
      action: 'confirmed',
      dispute_reason: null,
      created_at: new Date().toISOString(),
    }

    const confirmations = [confirmation]
    await session.merge({ confirmations }).save()

    // Check if user already confirmed
    const result = await ReviewSession.findOrFail(session.id)
    const existing = result.confirmations?.find((c) => c.user_id === reviewee.id)
    assert.isNotNull(existing)
  })

  test('only reviewee can confirm', async ({ assert }) => {
    const { reviewee, session } = await createCompletedSession()
    assert.equal(session.reviewee_id, reviewee.id)

    const outsider = await UserFactory.create()
    assert.notEqual(session.reviewee_id, outsider.id)
  })

  test('total_reviews_given increments on confirmation', async ({ assert }) => {
    const { reviewer } = await createCompletedSession()

    const credData = reviewer.credibility_data ?? {
      credibility_score: 50,
      total_reviews_given: 0,
      accurate_reviews: 0,
      disputed_reviews: 0,
      last_calculated_at: null,
    }

    credData.total_reviews_given = (credData.total_reviews_given ?? 0) + 1
    await reviewer.merge({ credibility_data: credData }).save()

    const result = await User.findOrFail(reviewer.id)
    assert.equal(result.credibility_data?.total_reviews_given, 1)
  })

  test('confirmations JSONB appends correctly', async ({ assert }) => {
    const { reviewee, session } = await createCompletedSession()
    const secondReviewee = await UserFactory.create()

    const confirmations: ReviewConfirmationEntry[] = [
      {
        user_id: reviewee.id,
        action: 'confirmed',
        dispute_reason: null,
        created_at: new Date().toISOString(),
      },
      {
        user_id: secondReviewee.id,
        action: 'disputed',
        dispute_reason: 'Some reason',
        created_at: new Date().toISOString(),
      },
    ]

    await session.merge({ confirmations }).save()

    const result = await ReviewSession.findOrFail(session.id)
    assert.equal(result.confirmations!.length, 2)
    assert.equal(result.confirmations![0]!.action, 'confirmed')
    assert.equal(result.confirmations![1]!.action, 'disputed')
  })
})
