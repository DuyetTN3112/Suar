import { test } from '@japa/runner'

import {
  ConfirmReviewDTO,
  type CountRow,
  createCompletedSession,
  db,
  drainReviewDomainEvents,
  makeConfirmReviewCommand,
  type ReceiptEvidenceRow,
  RedisCacheStore,
  type ReviewConfirmedOutboxRow,
  type ReviewDisputeRow,
  ReviewDisputeStatus,
  ReviewSession,
  ReviewSessionStatus,
  seedNativeAccomplishmentClaim,
  type TalentReindexOutboxEvidence,
  User,
  configureConfirmReviewTestGroup,
} from '#modules/reviews/tests/backend/integration/support/confirm_review_test_support'

test.group('Integration | Confirm Review - Credibility and Disputes', (group) => {
  configureConfirmReviewTestGroup(group)

  test('confirmed review writes a confirmation entry and recalculates reviewer credibility', async ({
    assert,
  }) => {
    const { reviewee, reviewer, session } = await createCompletedSession()
    const command = makeConfirmReviewCommand(reviewee.id)
    const confirmationDependentCacheKeys = [
      `review:session:v4:sessionId:${session.id}`,
      `users:spider_chart:v4:${reviewee.id}`,
      `users:featured_reviews:v2:${reviewee.id}:3`,
      `users:delivery_metrics:${reviewee.id}`,
    ]
    await Promise.all(
      confirmationDependentCacheKeys.map((key) => RedisCacheStore.set(key, { stale: true }))
    )

    const confirmation = await command.handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const updatedSession = await ReviewSession.findOrFail(session.id)
    const confirmations = updatedSession.confirmations ?? []
    const savedConfirmation = confirmations[0]
    const reviewerBeforeDelivery = await User.findOrFail(reviewer.id)
    const outboxRow = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .firstOrFail()) as ReviewConfirmedOutboxRow

    assert.equal(confirmation.action, 'confirmed')
    assert.equal(confirmation.user_id, reviewee.id)
    assert.equal(updatedSession.status, ReviewSessionStatus.COMPLETED)
    assert.equal(confirmations.length, 1)
    assert.equal(reviewerBeforeDelivery.credibility_data?.total_reviews_given, 0)
    assert.equal(outboxRow.status, 'pending')
    assert.equal(outboxRow.aggregate_type, 'review_session')
    assert.equal(outboxRow.payload['reviewSessionId'], session.id)
    assert.isNull(outboxRow.payload['accomplishmentProjection'])
    assert.deepEqual(await drainReviewDomainEvents(), {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })

    const updatedReviewer = await User.findOrFail(reviewer.id)
    assert.isDefined(savedConfirmation)
    if (!savedConfirmation) {
      return
    }

    assert.equal(savedConfirmation.action, 'confirmed')
    assert.equal(updatedReviewer.credibility_data?.total_reviews_given, 1)
    assert.equal(updatedReviewer.credibility_data?.accurate_reviews, 1)
    assert.equal(updatedReviewer.credibility_data?.credibility_score, 90)
    const receipt = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', outboxRow.payload['confirmationId'])
      .firstOrFail()) as unknown as ReceiptEvidenceRow
    assert.equal(receipt.state, 'completed')
    assert.isNotNull(receipt.external_effects_saved_at)
    assert.equal(Number(receipt.external_effect_cursor), Number(receipt.external_effect_total))
    const talentReindex = (await db
      .from('domain_event_outbox')
      .where('event_name', 'search:talent-reindex-requested')
      .where('aggregate_id', reviewee.id)
      .firstOrFail()) as unknown as TalentReindexOutboxEvidence
    assert.equal(talentReindex.status, 'pending')
    assert.equal(talentReindex.aggregate_type, 'user_talent')
    assert.deepInclude(talentReindex.payload, {
      userId: reviewee.id,
      sourceEventName: 'reviews:talent-explainability-projection:changed:v1',
    })
    assert.match(talentReindex.payload['sourceEventId'], /^\d+$/)
    for (const key of confirmationDependentCacheKeys) {
      assert.isNull(await RedisCacheStore.get(key), `Expected confirmation to invalidate ${key}`)
    }
  })

  test('confirmed native review carries an unambiguous accomplishment projection identity', async ({
    assert,
  }) => {
    const { reviewee, reviewer, session, task, assignment, org } = await createCompletedSession()
    const fixture = await seedNativeAccomplishmentClaim({
      revieweeId: reviewee.id,
      reviewerId: reviewer.id,
      sessionId: session.id,
      taskId: task.id,
      assignmentId: assignment.id,
      organizationId: org.id,
    })

    try {
      await makeConfirmReviewCommand(reviewee.id).handle(
        new ConfirmReviewDTO({
          review_session_id: session.id,
          action: 'confirmed',
        })
      )

      const outboxRow = (await db
        .from('domain_event_outbox')
        .where('event_name', 'review:confirmed')
        .where('aggregate_id', session.id)
        .firstOrFail()) as ReviewConfirmedOutboxRow
      const projection = outboxRow.payload['accomplishmentProjection'] as {
        reviewWorkflowId: string
        completionClaimId: string
        reviewFinalizedFactId: string
        reviewFinalizedFactHash: string
        projectionPolicyVersion: string
      }

      type RevisionRow = {
        completion_claim_id: string
        observation_fact_id: string
        revision_hash: string
      }
      const revisionRow = (await db
        .from('review_observation_revisions')
        .where('id', fixture.revisionId)
        .select('completion_claim_id', 'observation_fact_id', 'revision_hash')
        .firstOrFail()) as RevisionRow

      assert.deepEqual(projection, {
        reviewWorkflowId: fixture.workflowId,
        completionClaimId: revisionRow.completion_claim_id,
        reviewFinalizedFactId: revisionRow.observation_fact_id,
        reviewFinalizedFactHash: revisionRow.revision_hash,
        projectionPolicyVersion: 'review-policy-2026.08',
      })
      assert.equal(fixture.observationId.length, 36)
    } finally {
      await db.from('review_observation_evidence_links').delete()
      await db.from('review_observation_revisions').delete()
      await db.from('review_observations').delete()
      await db.from('task_review_workflows').where('id', fixture.workflowId).delete()
    }
  })

  test('confirmed review verifies evidence linked to submitted skill ratings', async ({
    assert,
  }) => {
    const { reviewee, session } = await createCompletedSession()
    const linkedSkillReview = (await db
      .from('skill_reviews')
      .where('review_session_id', session.id)
      .where('review_status', 'submitted')
      .select('id')
      .firstOrFail()) as { id: string }
    const [linkedEvidence] = (await db
      .table('review_evidences')
      .insert({
        review_session_id: session.id,
        evidence_type: 'pull_request',
        url: 'https://example.test/linked-pr',
        title: 'Linked PR',
        uploaded_by: reviewee.id,
        verification_status: 'pending',
        is_sensitive: false,
      })
      .returning('id')) as Array<{ id: string }>
    const [unlinkedEvidence] = (await db
      .table('review_evidences')
      .insert({
        review_session_id: session.id,
        evidence_type: 'document_link',
        url: 'https://example.test/unlinked-doc',
        title: 'Unlinked doc',
        uploaded_by: reviewee.id,
        verification_status: 'pending',
        is_sensitive: false,
      })
      .returning('id')) as Array<{ id: string }>

    if (!linkedEvidence || !unlinkedEvidence) {
      throw new Error('Expected evidence fixtures to be created')
    }

    await db.table('skill_review_evidence_links').insert({
      skill_review_id: linkedSkillReview.id,
      review_evidence_id: linkedEvidence.id,
      relevance_type: 'direct_observation',
      reviewer_note: 'This PR supports the rating',
    })

    await makeConfirmReviewCommand(reviewee.id).handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const rows = (await db
      .from('review_evidences')
      .whereIn('id', [linkedEvidence.id, unlinkedEvidence.id])
      .select('id', 'verification_status')) as Array<{
      id: string
      verification_status: string | null
    }>
    const statusById = new Map(rows.map((row) => [row.id, row.verification_status]))

    assert.equal(statusById.get(linkedEvidence.id), 'verified')
    assert.equal(statusById.get(unlinkedEvidence.id), 'pending')

    await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .delete()
  })

  test('opening a dispute does not penalize reviewer credibility before admin resolution', async ({
    assert,
  }) => {
    const { reviewee, reviewer, session } = await createCompletedSession()
    const command = makeConfirmReviewCommand(reviewee.id)

    await command.handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'disputed',
        dispute_reason: 'Đánh giá không chính xác',
      })
    )
    assert.deepEqual(await drainReviewDomainEvents(), {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })

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
    assert.equal(updatedReviewer.credibility_data?.total_reviews_given, 0)
    assert.equal(updatedReviewer.credibility_data?.disputed_reviews, 0)
    assert.equal(updatedReviewer.credibility_data?.credibility_score, 50)

    const disputes = (await db
      .from('review_disputes')
      .where('review_session_id', session.id)
      .select(
        'review_session_id',
        'reviewee_id',
        'opened_by',
        'status',
        'requested_outcome'
      )) as ReviewDisputeRow[]

    assert.lengthOf(disputes, 1)
    assert.equal(disputes[0]?.review_session_id, session.id)
    assert.equal(disputes[0]?.reviewee_id, reviewee.id)
    assert.equal(disputes[0]?.opened_by, reviewee.id)
    assert.equal(disputes[0]?.status, ReviewDisputeStatus.PENDING)
    assert.equal(disputes[0]?.requested_outcome, 'other')
  })

  test('same reviewee cannot confirm the same session twice', async ({ assert }) => {
    const { reviewee, session } = await createCompletedSession()
    const command = makeConfirmReviewCommand(reviewee.id)
    const dto = new ConfirmReviewDTO({
      review_session_id: session.id,
      action: 'confirmed',
    })

    await command.handle(dto)
    await assert.rejects(() => command.handle(dto))
    const outboxCounts = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .count('* as total')) as CountRow[]
    assert.equal(Number(outboxCounts[0]?.total ?? 0), 1)
  })

  test('reviewee cannot open a second active dispute through confirm flow', async ({ assert }) => {
    const { reviewee, session, task, assignment } = await createCompletedSession()
    await db.table('review_disputes').insert({
      review_session_id: session.id,
      task_assignment_id: assignment.id,
      task_id: task.id,
      reviewee_id: reviewee.id,
      opened_by: reviewee.id,
      status: ReviewDisputeStatus.PENDING,
      dispute_reason: 'Existing dispute',
      requested_outcome: 'other',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([]),
    })

    const command = makeConfirmReviewCommand(reviewee.id)

    await assert.rejects(() =>
      command.handle(
        new ConfirmReviewDTO({
          review_session_id: session.id,
          action: 'disputed',
          dispute_reason: 'Need another dispute',
        })
      )
    )

    const outboxCounts = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .count('* as total')) as CountRow[]
    assert.equal(Number(outboxCounts[0]?.total ?? 0), 0)
  })
})
