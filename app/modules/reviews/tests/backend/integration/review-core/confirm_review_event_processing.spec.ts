import { test } from '@japa/runner'

import {
  AdonisDomainEventDispatcher,
  ConfirmReviewDTO,
  type CountRow,
  createCompletedSession,
  db,
  type DeadLetterEvidenceRow,
  type DomainEventOutboxRepository,
  DomainEventOutboxWorker,
  LucidReviewConfirmedReceiptStore,
  LucidReviewProjectionLock,
  LucidReviewTransactionRunner,
  makeConfirmReviewCommand,
  type OutboxEvidenceRow,
  PIPELINE_AUDIT_ACTIONS,
  PostgresDomainEventOutboxRepository,
  ProcessReviewConfirmedEventCommand,
  randomUUID,
  type ReceiptEvidenceRow,
  type ReviewExternalEffectPublisher,
  reviewExternalDependencies,
  reviewMetricsReader,
  reviewSessionReads,
  reviewTalentFactSources,
  type TalentExplainabilityProjectionChangedV1,
  User,
  configureConfirmReviewTestGroup,
} from '../support/confirm_review_test_support.js'

test.group('Integration | Confirm Review - Event Processing and Resilience', (group) => {
  configureConfirmReviewTestGroup(group)

  test('ACK loss retries external delivery without repeating database audits', async ({
    assert,
  }) => {
    const { reviewee, session } = await createCompletedSession()
    const command = makeConfirmReviewCommand(reviewee.id)
    await command.handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const postgresRepository = new PostgresDomainEventOutboxRepository()
    let rejectFirstAcknowledgement = true
    const repository: DomainEventOutboxRepository = {
      stage: postgresRepository.stage.bind(postgresRepository),
      claimBatch: postgresRepository.claimBatch.bind(postgresRepository),
      heartbeat: postgresRepository.heartbeat.bind(postgresRepository),
      acknowledge: async (input) => {
        if (rejectFirstAcknowledgement) {
          rejectFirstAcknowledgement = false
          return false
        }
        return postgresRepository.acknowledge(input)
      },
      retry: postgresRepository.retry.bind(postgresRepository),
      deadLetter: postgresRepository.deadLetter.bind(postgresRepository),
    }
    let now = new Date('2030-07-26T12:00:00.000Z')
    const worker = new DomainEventOutboxWorker({
      workerId: `confirm-review-ack-loss:${randomUUID()}`,
      repository,
      dispatcher: new AdonisDomainEventDispatcher(),
      now: () => now,
      leaseDurationMs: 5_000,
      heartbeatIntervalMs: 1_000,
      handlerDeadlineMs: 4_000,
      concurrency: 1,
    })

    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 1,
    })
    const auditsAfterFirstDelivery = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    now = new Date(now.getTime() + 5_001)
    await db
      .from('domain_event_outbox')
      .where('event_name', 'search:talent-reindex-requested')
      .delete()
    assert.deepEqual(await worker.runOnce(), {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    const auditsAfterRetry = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    assert.equal(auditsAfterRetry, auditsAfterFirstDelivery)

    const receipt = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', `review-confirmed:${session.id}:${reviewee.id}`)
      .firstOrFail()) as unknown as ReceiptEvidenceRow
    assert.equal(receipt.state, 'completed')
  })

  test('completed review-confirmed replay is a no-op', async ({ assert }) => {
    const { reviewee, session } = await createCompletedSession()
    await makeConfirmReviewCommand(reviewee.id).handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const outbox = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .firstOrFail()) as unknown as OutboxEvidenceRow
    const processor = new ProcessReviewConfirmedEventCommand(
      reviewExternalDependencies,
      reviewMetricsReader,
      {
        emitSkillScoreUpdated: () => Promise.resolve(),
        invalidateUserProfileReviewData: () => Promise.resolve(),
        publishTalentProjection: () => Promise.resolve(),
      },
      reviewTalentFactSources,
      reviewSessionReads,
      new LucidReviewTransactionRunner(),
      new LucidReviewConfirmedReceiptStore(),
      new LucidReviewProjectionLock()
    )

    await processor.handle(outbox.payload)
    const auditCountAfterFirstDelivery = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    const receiptAfterFirstDelivery = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', outbox.payload.confirmationId)
      .firstOrFail()) as unknown as ReceiptEvidenceRow

    await processor.handle(outbox.payload)

    const auditCountAfterReplay = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    const receiptAfterReplay = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', outbox.payload.confirmationId)
      .firstOrFail()) as unknown as ReceiptEvidenceRow

    assert.equal(receiptAfterFirstDelivery.state, 'completed')
    assert.equal(receiptAfterReplay.state, 'completed')
    assert.equal(auditCountAfterReplay, auditCountAfterFirstDelivery)
    assert.equal(
      Number(receiptAfterReplay.external_effect_cursor),
      Number(receiptAfterFirstDelivery.external_effect_cursor)
    )
  })

  test('dead-letters a forged review-confirmed envelope without applying projections', async ({
    assert,
  }) => {
    const { reviewee, reviewer, session } = await createCompletedSession()
    const command = makeConfirmReviewCommand(reviewee.id)
    await command.handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )

    const outbox = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .firstOrFail()) as unknown as OutboxEvidenceRow
    await db
      .from('domain_event_outbox')
      .where('id', outbox.id)
      .update({
        payload: {
          ...outbox.payload,
          reviewerIds: [randomUUID()],
        },
      })

    assert.deepEqual(
      await new DomainEventOutboxWorker({
        workerId: `confirm-review-forged-source:${randomUUID()}`,
        dispatcher: new AdonisDomainEventDispatcher(),
        concurrency: 1,
      }).runOnce(),
      {
        claimed: 1,
        processed: 0,
        retried: 0,
        deadLettered: 1,
        leaseLost: 0,
      }
    )

    const deadLetter = (await db
      .from('domain_event_outbox')
      .select('status', 'last_error_code')
      .where('id', outbox.id)
      .firstOrFail()) as unknown as DeadLetterEvidenceRow
    assert.equal(deadLetter.status, 'dead_letter')
    assert.equal(deadLetter.last_error_code, 'INVALID_DOMAIN_EVENT_ENVELOPE')
    assert.isNull(
      await db
        .from('review_confirmed_processing_receipts')
        .where('confirmation_id', `review-confirmed:${session.id}:${reviewee.id}`)
        .first()
    )

    const unchangedReviewer = await User.findOrFail(reviewer.id)
    assert.equal(unchangedReviewer.credibility_data?.total_reviews_given, 0)
  })

  test('external failure retries stable effects without repeating the database phase', async ({
    assert,
  }) => {
    const { reviewee, session } = await createCompletedSession()
    await makeConfirmReviewCommand(reviewee.id).handle(
      new ConfirmReviewDTO({
        review_session_id: session.id,
        action: 'confirmed',
      })
    )
    const outbox = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .firstOrFail()) as unknown as OutboxEvidenceRow

    let rejectProjection = true
    let skillDeliveries = 0
    let cacheInvalidations = 0
    const deliveredProjections: TalentExplainabilityProjectionChangedV1[] = []
    const externalEffects: ReviewExternalEffectPublisher = {
      emitSkillScoreUpdated: () => {
        skillDeliveries += 1
        return Promise.resolve()
      },
      invalidateUserProfileReviewData: () => {
        cacheInvalidations += 1
        return Promise.resolve()
      },
      publishTalentProjection: (event) => {
        deliveredProjections.push(event)
        if (rejectProjection) {
          return Promise.reject(new Error('temporary projection failure'))
        }
        return Promise.resolve()
      },
    }
    const processor = new ProcessReviewConfirmedEventCommand(
      reviewExternalDependencies,
      reviewMetricsReader,
      externalEffects,
      reviewTalentFactSources,
      reviewSessionReads,
      new LucidReviewTransactionRunner(),
      new LucidReviewConfirmedReceiptStore(),
      new LucidReviewProjectionLock()
    )

    const payload = outbox.payload
    await assert.rejects(() => processor.handle(payload))
    const auditsAfterFailure = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    const pendingReceipt = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', `review-confirmed:${session.id}:${reviewee.id}`)
      .firstOrFail()) as unknown as ReceiptEvidenceRow
    assert.equal(pendingReceipt.state, 'database_applied')
    assert.equal(Number(pendingReceipt.external_attempt_count), 1)
    assert.equal(pendingReceipt.last_external_error_code, 'REVIEW_CONFIRMED_EXTERNAL_EFFECT_FAILED')
    const skillDeliveriesAfterFailure = skillDeliveries
    const cacheInvalidationsAfterFailure = cacheInvalidations
    assert.isAbove(Number(pendingReceipt.external_effect_cursor), 0)
    assert.isBelow(
      Number(pendingReceipt.external_effect_cursor),
      Number(pendingReceipt.external_effect_total)
    )

    rejectProjection = false
    await processor.handle(payload)
    const auditsAfterRecovery = Number(
      (
        (await db
          .from('audit_events')
          .whereIn('action', [...PIPELINE_AUDIT_ACTIONS])
          .count('* as total')
          .firstOrFail()) as CountRow
      ).total
    )
    assert.equal(auditsAfterRecovery, auditsAfterFailure)
    assert.equal(skillDeliveries, skillDeliveriesAfterFailure)
    assert.equal(cacheInvalidations, cacheInvalidationsAfterFailure)
    assert.lengthOf(deliveredProjections, 2)
    assert.deepEqual(deliveredProjections[1], deliveredProjections[0])

    const completedReceipt = (await db
      .from('review_confirmed_processing_receipts')
      .where('confirmation_id', `review-confirmed:${session.id}:${reviewee.id}`)
      .firstOrFail()) as unknown as ReceiptEvidenceRow
    assert.equal(completedReceipt.state, 'completed')
    assert.equal(
      Number(completedReceipt.external_effect_cursor),
      Number(completedReceipt.external_effect_total)
    )
  })
})
