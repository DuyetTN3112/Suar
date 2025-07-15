import { test } from '@japa/runner'

import { ReviewSessionStatus } from '#constants/review_constants'
import { ProficiencyLevel } from '#constants/user_constants'
import ConflictException from '#exceptions/conflict_exception'
import AuditLog from '#models/mongo/audit_log'
import ReviewSession from '#models/review_session'
import SkillReview from '#models/skill_review'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import SubmitReviewScenario from '#tests/integration/reviews/support/submit_review_scenario'

test.group('Integration | Submit Review', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('manager submission persists reviews, manager dimensions, and audit state', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()

    const reviews = await scenario.submitManager(
      [
        scenario.rating(scenario.skill1.id, ProficiencyLevel.SENIOR, 'Strong implementation quality'),
        scenario.rating(scenario.skill2.id, ProficiencyLevel.LEAD),
      ],
      {
        overall_quality_score: 5,
        delivery_timeliness: 'on_time',
        requirement_adherence: 5,
        communication_quality: 4,
        code_quality_score: 5,
        proactiveness_score: 4,
        would_work_with_again: true,
        strengths_observed: 'Reliable delivery',
        areas_for_improvement: 'Share more updates early',
      }
    )

    const updatedSession = await ReviewSession.findOrFail(scenario.sessionId)
    const savedReviews = await SkillReview.query()
      .where('review_session_id', scenario.sessionId)
      .where('reviewer_id', scenario.ownerId)
      .orderBy('created_at', 'asc')
    const logs = await AuditLog.query()
      .where('entity_type', 'review_session')
      .where('entity_id', scenario.sessionId)
      .where('action', 'submit_review')

    assert.lengthOf(reviews, 2)
    assert.lengthOf(savedReviews, 2)
    assert.equal(savedReviews[0]?.reviewer_type, 'manager')
    assert.isTrue(updatedSession.manager_review_completed)
    assert.equal(updatedSession.overall_quality_score, 5)
    assert.equal(updatedSession.delivery_timeliness, 'on_time')
    assert.equal(updatedSession.status, ReviewSessionStatus.IN_PROGRESS)
    assert.isAbove(logs.length, 0)
  })

  test('peer submission increments counters and rejects duplicate reviewers', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()

    await scenario.submitPeer(scenario.reviewerId, [
      scenario.rating(scenario.skill1.id, ProficiencyLevel.MIDDLE),
    ])

    await assert.rejects(
      () =>
        scenario.submitPeer(scenario.reviewerId, [
          scenario.rating(scenario.skill1.id, ProficiencyLevel.SENIOR),
        ]),
      ConflictException
    )

    const updatedSession = await ReviewSession.findOrFail(scenario.sessionId)
    assert.equal(updatedSession.peer_reviews_count, 1)
    assert.equal(updatedSession.status, ReviewSessionStatus.IN_PROGRESS)
  })

  test('session completes only after manager review and the required peer reviews land', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()
    const peer1 = await scenario.createPeer()
    const peer2 = await scenario.createPeer()

    await scenario.submitManager([scenario.rating(scenario.skill1.id, ProficiencyLevel.SENIOR)])
    await scenario.submitPeer(peer1.id, [scenario.rating(scenario.skill1.id, ProficiencyLevel.MIDDLE)])
    await scenario.submitPeer(peer2.id, [scenario.rating(scenario.skill1.id, ProficiencyLevel.LEAD)])

    const completedSession = await ReviewSession.findOrFail(scenario.sessionId)
    assert.equal(completedSession.status, ReviewSessionStatus.COMPLETED)
    assert.isTrue(completedSession.manager_review_completed)
    assert.equal(completedSession.peer_reviews_count, 2)
    assert.isNotNull(completedSession.completed_at)
  })

  test('invalid skill ratings are rejected before any review rows are persisted', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()
    const invalidCases = await scenario.buildInvalidSkillRatingCases()

    for (const invalidCase of invalidCases) {
      await assert.rejects(() => invalidCase.execute(), invalidCase.errorType)
      const persistedReviews = await SkillReview.query().where('review_session_id', invalidCase.sessionId)
      assert.lengthOf(persistedReviews, 0)
    }
  })
})
