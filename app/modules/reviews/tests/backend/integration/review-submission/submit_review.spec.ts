import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeSubmitSkillReviewCommand } from '#composition/reviews/review-core/review_action_factory'
import AuditLog from '#modules/audit/infra/models/audit-log/audit_log'
import { ForbiddenPolicyViolationException } from '#modules/authorization/public_contracts/policy_violation'
import RedisCacheStore from '#modules/cache/infra/adapters/cache-runtime/redis_cache_store'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { SubmitSkillReviewDTO } from '#modules/reviews/actions/dtos/request/review_dtos'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import ReviewSession from '#modules/reviews/infra/models/review-session/review_session'
import ReviewSessionReviewerAssignment from '#modules/reviews/infra/models/review-session/review_session_reviewer_assignment'
import SkillReview from '#modules/reviews/infra/models/self-assessment/skill_review'
import { ReviewSessionStatus } from '#modules/reviews/public_contracts/review_constants'
import SubmitReviewScenario from '#modules/reviews/tests/backend/support/submit_review_scenario'
import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Submit Review', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await db.from('domain_event_outbox_replay_history').delete()
    await db.from('domain_event_outbox').delete()
    await cleanupTestData()
  })

  test('manager submission persists reviews, manager dimensions, and audit state', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()
    const pendingLogicalCacheKey = `user:pending_reviews:after::before::perPage:10:userId:${scenario.ownerId}`
    const pendingNamespaces = entityCacheGenerationNamespaces(
      CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews,
      'user',
      scenario.ownerId
    )
    const pendingPhysicalCacheKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      pendingNamespaces,
      pendingLogicalCacheKey
    )
    if (!pendingPhysicalCacheKey) {
      throw new Error('Expected pending-review generation key')
    }
    const submissionDependentCacheKeys = [
      `users:spider_chart:v4:${scenario.revieweeId}`,
      `review:session:v4:sessionId:${scenario.sessionId}`,
    ]
    await Promise.all(
      [...submissionDependentCacheKeys, pendingPhysicalCacheKey].map((key) =>
        RedisCacheStore.set(key, { stale: true })
      )
    )

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
    for (const key of submissionDependentCacheKeys) {
      assert.isNull(
        await RedisCacheStore.get(key),
        `Expected review submission to invalidate ${key}`
      )
    }
    const nextPendingPhysicalCacheKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      pendingNamespaces,
      pendingLogicalCacheKey
    )
    assert.isNotNull(nextPendingPhysicalCacheKey)
    assert.notEqual(nextPendingPhysicalCacheKey, pendingPhysicalCacheKey)
    assert.isNull(
      await RedisCacheStore.get(nextPendingPhysicalCacheKey ?? 'generation-resolution-failed')
    )
    assert.deepEqual(await RedisCacheStore.get(pendingPhysicalCacheKey), { stale: true })
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

  test('serializes concurrent submissions without duplicate rows or lost counters', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()
    const sameReviewerResults = await Promise.allSettled([
      scenario.submitPeer(scenario.reviewerId, [
        scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L7),
      ]),
      scenario.submitPeer(scenario.reviewerId, [
        scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L7),
      ]),
    ])
    assert.equal(sameReviewerResults.filter((result) => result.status === 'fulfilled').length, 1)
    assert.equal(sameReviewerResults.filter((result) => result.status === 'rejected').length, 1)

    const distinctScenario = await SubmitReviewScenario.build()
    const peer2 = await distinctScenario.createPeer()
    await Promise.all([
      distinctScenario.submitPeer(distinctScenario.reviewerId, [
        distinctScenario.rating(distinctScenario.skill1.id, CanonicalProficiencyLevelCode.L7),
      ]),
      distinctScenario.submitPeer(peer2.id, [
        distinctScenario.rating(distinctScenario.skill2.id, CanonicalProficiencyLevelCode.L10),
      ]),
    ])

    const session = await ReviewSession.findOrFail(distinctScenario.sessionId)
    const reviews = await SkillReview.query().where('review_session_id', distinctScenario.sessionId)
    const outboxRows = await db
      .from('domain_event_outbox')
      .where('event_name', 'review:submitted')
      .where('aggregate_id', distinctScenario.sessionId)
    assert.equal(session.peer_reviews_count, 2)
    assert.lengthOf(reviews, 2)
    assert.lengthOf(outboxRows, 2)
  })

  test('outsider cannot submit peer review and peer cannot spoof manager reviewer type', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()
    const outsider = await scenario.createOutsider()
    const outsiderPendingLogicalCacheKey = `user:pending_reviews:after::before::perPage:10:userId:${outsider.id}`
    const outsiderPendingNamespaces = entityCacheGenerationNamespaces(
      CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews,
      'user',
      outsider.id
    )
    const outsiderPendingCacheKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      outsiderPendingNamespaces,
      outsiderPendingLogicalCacheKey
    )
    if (!outsiderPendingCacheKey) {
      throw new Error('Expected outsider pending-review generation key')
    }
    await RedisCacheStore.set(outsiderPendingCacheKey, { data: ['still-pending'] })

    await assert.rejects(
      () =>
        scenario.submitPeer(outsider.id, [
          scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L7),
        ]),
      ForbiddenPolicyViolationException
    )
    assert.deepEqual(await RedisCacheStore.get(outsiderPendingCacheKey), {
      data: ['still-pending'],
    })
    assert.equal(
      await RedisCacheStore.resolveVersionedKeyBestEffort(
        outsiderPendingNamespaces,
        outsiderPendingLogicalCacheKey
      ),
      outsiderPendingCacheKey
    )

    await assert.rejects(
      () =>
        makeSubmitSkillReviewCommand(makeSystemReviewActionContext(scenario.reviewerId)).handle(
          new SubmitSkillReviewDTO({
            review_session_id: scenario.sessionId,
            reviewer_type: 'manager',
            skill_ratings: [scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L10)],
          })
        ),
      ForbiddenPolicyViolationException
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
      ConflictException
    )
  })

  test('invalid skill ratings are rejected before any review rows are persisted', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()
    const invalidCases = await scenario.buildInvalidSkillRatingCases()

    for (const invalidCase of invalidCases) {
      await assert.rejects(() => invalidCase.execute(), invalidCase.errorType)
      const persistedReviews = await SkillReview.query().where(
        'review_session_id',
        invalidCase.sessionId
      )
      assert.lengthOf(persistedReviews, 0)
    }
  })

  test('rejects evidence from another review session without persisting submission state', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()
    const otherScenario = await SubmitReviewScenario.build()
    const [foreignEvidence] = (await db
      .table('review_evidences')
      .insert({
        review_session_id: otherScenario.sessionId,
        evidence_type: 'pull_request',
        uploaded_by: otherScenario.ownerId,
      })
      .returning('id')) as Array<{ id: string }>
    if (!foreignEvidence) {
      throw new Error('Expected foreign review evidence fixture')
    }

    await assert.rejects(
      () =>
        makeSubmitSkillReviewCommand(makeSystemReviewActionContext(scenario.reviewerId)).handle(
          new SubmitSkillReviewDTO({
            review_session_id: scenario.sessionId,
            reviewer_type: 'peer',
            skill_ratings: [
              {
                ...scenario.rating(scenario.skill1.id, CanonicalProficiencyLevelCode.L7),
                evidence_ids: [foreignEvidence.id],
              },
            ],
          })
        ),
      ValidationException
    )

    const [persistedReviews, assignment] = await Promise.all([
      SkillReview.query().where('review_session_id', scenario.sessionId),
      ReviewSessionReviewerAssignment.query()
        .where('review_session_id', scenario.sessionId)
        .where('reviewer_id', scenario.reviewerId)
        .first(),
    ])
    assert.lengthOf(persistedReviews, 0)
    assert.equal(assignment?.status, 'pending')
    assert.isNull(assignment?.submitted_at ?? null)
  })

  test('legacy proficiency band tokens are rejected before review persistence', async ({
    assert,
  }) => {
    const scenario = await SubmitReviewScenario.build()

    await assert.rejects(
      () => scenario.submitManager([scenario.rating(scenario.skill1.id, 'senior')]),
      /canonical code \(l0-l14\)/
    )

    const persistedReviews = await SkillReview.query().where(
      'review_session_id',
      scenario.sessionId
    )
    assert.lengthOf(persistedReviews, 0)
  })
})
