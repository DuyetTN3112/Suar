import { test } from '@japa/runner'

import AuditLog from '#modules/audit/infra/models/audit_log'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import SubmitSkillReviewCommand from '#modules/reviews/actions/commands/submit_skill_review_command'
import { SubmitSkillReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import ReviewSession from '#modules/reviews/infra/models/review_session'
import ReviewSessionReviewerAssignment from '#modules/reviews/infra/models/review_session_reviewer_assignment'
import SkillReview from '#modules/reviews/infra/models/skill_review'
import SubmitReviewScenario from '#modules/reviews/tests/backend/support/submit_review_scenario'
import { CanonicalProficiencyLevelCode } from '#modules/skills/constants/proficiency_level_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

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
        scenario.rating(
          scenario.skill1.id,
          CanonicalProficiencyLevelCode.L10,
          'Strong implementation quality'
        ),
        scenario.rating(scenario.skill2.id, CanonicalProficiencyLevelCode.L12),
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
    const managerAssignment = await ReviewSessionReviewerAssignment.query()
      .where('review_session_id', scenario.sessionId)
      .where('reviewer_id', scenario.ownerId)
      .where('reviewer_type', 'manager')
      .first()

    assert.lengthOf(reviews, 2)
    assert.lengthOf(savedReviews, 2)
    assert.equal(savedReviews[0]?.reviewer_type, 'manager')
    assert.isTrue(updatedSession.manager_review_completed)
    assert.equal(updatedSession.overall_quality_score, 5)
    assert.equal(updatedSession.delivery_timeliness, 'on_time')
    assert.equal(updatedSession.status, ReviewSessionStatus.IN_PROGRESS)
    assert.equal(managerAssignment?.status, 'submitted')
    assert.isNotNull(managerAssignment?.submitted_at ?? null)
    await AuditLog.query()
      .where('entity_type', 'review_session')
      .where('entity_id', scenario.sessionId)
      .where('action', 'submit_review')
  })

  test('peer submission increments counters and rejects duplicate reviewers', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()

    await scenario.submitPeer(scenario.reviewerId, [
      scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L7),
    ])

    await assert.rejects(
      () =>
        scenario.submitPeer(scenario.reviewerId, [
          scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L10),
        ]),
      ConflictException
    )

    const updatedSession = await ReviewSession.findOrFail(scenario.sessionId)
    const peerAssignment = await ReviewSessionReviewerAssignment.query()
      .where('review_session_id', scenario.sessionId)
      .where('reviewer_id', scenario.reviewerId)
      .where('reviewer_type', 'peer')
      .first()
    assert.equal(updatedSession.peer_reviews_count, 1)
    assert.equal(updatedSession.status, ReviewSessionStatus.IN_PROGRESS)
    assert.equal(peerAssignment?.status, 'submitted')
  })

  test('outsider cannot submit peer review and peer cannot spoof manager reviewer type', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()
    const outsider = await scenario.createOutsider()

    await assert.rejects(
      () =>
        scenario.submitPeer(outsider.id, [
          scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L7),
        ]),
      ForbiddenException
    )

    await assert.rejects(
      () =>
        new SubmitSkillReviewCommand(makeSystemReviewActionContext(scenario.reviewerId)).handle(
          new SubmitSkillReviewDTO({
            review_session_id: scenario.sessionId,
            reviewer_type: 'manager',
            skill_ratings: [
              scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L10),
            ],
          })
        ),
      ForbiddenException
    )
  })

  test('session completes once creator-manager and required peer quorum land', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()
    const peer1 = await scenario.createPeer()
    const peer2 = await scenario.createPeer()

    await scenario.submitManager([
      scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L10),
    ])
    await scenario.submitPeer(peer1.id, [
      scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L7),
    ])

    const completedSession = await ReviewSession.findOrFail(scenario.sessionId)
    assert.equal(completedSession.status, ReviewSessionStatus.COMPLETED)
    assert.isTrue(completedSession.manager_review_completed)
    assert.equal(completedSession.peer_reviews_count, 1)
    assert.isNotNull(completedSession.completed_at)

    await assert.rejects(
      () =>
        scenario.submitPeer(peer2.id, [
          scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L12),
        ]),
      /Review session không tồn tại hoặc không ở trạng thái có thể submit/
    )
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

  test('legacy proficiency band tokens are rejected before review persistence', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()

    await assert.rejects(
      () =>
        scenario.submitManager([
          scenario.rating(scenario.skill1.id, 'senior'),
        ]),
      /canonical code \(l0-l14\)/
    )

    const persistedReviews = await SkillReview.query().where('review_session_id', scenario.sessionId)
    assert.lengthOf(persistedReviews, 0)
  })
})
