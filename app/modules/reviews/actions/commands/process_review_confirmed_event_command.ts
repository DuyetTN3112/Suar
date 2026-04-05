import CalculatePerformanceScoreCommand from './calculate_performance_score_command.js'
import CalculateTrustScoreCommand from './calculate_trust_score_command.js'
import RecalculateRevieweeSkillScoresCommand from './recalculate_reviewee_skill_scores_command.js'
import UpdateReviewerCredibilityCommand from './update_reviewer_credibility_command.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'
import type { ReviewConfirmedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'
import type { TransactionalAuditWrite } from '#modules/reviews/actions/dtos/request/transactional_audit_options'
import type {
  ReviewConfirmedReceiptStore,
  ReviewProjectionLock,
} from '#modules/reviews/actions/ports/outbound/review_event_processing'
import type { ReviewExternalDependencies } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import type { TalentExplainabilityFactSourceReader } from '#modules/reviews/actions/ports/outbound/review_fact_source_readers'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type { ReviewSessionReadStore } from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import ListTalentExplainabilityProjectionsV1Query from '#modules/reviews/actions/queries/list_talent_explainability_projections_v1_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { ReviewConfirmedEvent } from '#modules/reviews/events/review_events'
import {
  buildReviewConfirmedExternalEffectPlan,
  ReviewConfirmedReceiptCollisionException,
  type ReviewConfirmedExternalEffectCheckpoint,
  type ReviewConfirmedExternalEffects,
  type ReviewConfirmedProcessingReceipt,
} from '#modules/reviews/public_contracts/review_confirmed_processing_receipt'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'

interface ReviewConfirmedDeliveryContext {
  signal?: AbortSignal
}

function externalFailureCode(error: unknown): string {
  if (error instanceof DomainEventDeliveryError) {
    return error.errorCode
  }
  return 'REVIEW_CONFIRMED_EXTERNAL_EFFECT_FAILED'
}

function permanentDeliveryError(error: unknown): DomainEventDeliveryError | null {
  if (error instanceof ReviewConfirmedReceiptCollisionException) {
    return new DomainEventDeliveryError('REVIEW_CONFIRMED_RECEIPT_COLLISION', false, {
      cause: error,
    })
  }
  if (error instanceof InvariantViolationException) {
    return new DomainEventDeliveryError('REVIEW_CONFIRMED_INVARIANT_VIOLATION', false, {
      cause: error,
    })
  }
  return null
}

function sameIdentities(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export default class ProcessReviewConfirmedEventCommand {
  constructor(
    private readonly dependencies: Pick<
      ReviewExternalDependencies,
      'organization' | 'user' | 'userSkill'
    >,
    private readonly metricsReader: ReviewMetricsReader,
    private readonly externalEffects: ReviewExternalEffectPublisher,
    private readonly talentSources: TalentExplainabilityFactSourceReader,
    private readonly sessionReads: ReviewSessionReadStore,
    private readonly transactions: ReviewTransactionRunner,
    private readonly receipts: ReviewConfirmedReceiptStore,
    private readonly projectionLock: ReviewProjectionLock
  ) {}

  async handle(
    event: ReviewConfirmedEvent,
    context: ReviewConfirmedDeliveryContext = {}
  ): Promise<void> {
    const signal = context.signal
    const payload: ReviewConfirmedOutboxPayload = {
      confirmationId: event.confirmationId,
      reviewSessionId: event.reviewSessionId,
      revieweeId: event.revieweeId,
      reviewerIds: event.reviewerIds,
      confirmedBy: event.confirmedBy,
      action: event.action,
    }
    signal?.throwIfAborted()

    let receipt: ReviewConfirmedProcessingReceipt
    try {
      receipt = await this.transactions.run((transaction) =>
        this.applyDatabasePhase(payload, transaction, signal)
      )
    } catch (error) {
      const permanent = permanentDeliveryError(error)
      if (permanent) throw permanent
      throw error
    }

    if (receipt.state === 'completed') {
      return
    }
    if (!receipt.externalEffects) {
      throw new DomainEventDeliveryError('REVIEW_CONFIRMED_EFFECTS_MISSING', false)
    }

    try {
      await this.applyExternalEffects(receipt, signal)
    } catch (error) {
      try {
        await this.receipts.recordExternalFailure(
          payload.confirmationId,
          externalFailureCode(error)
        )
      } catch {
        // Preserve the delivery failure. The durable outbox retry is the
        // authoritative recovery path when receipt telemetry cannot be saved.
      }
      throw error
    }
  }

  private async applyDatabasePhase(
    event: ReviewConfirmedOutboxPayload,
    trx: ReviewTransaction,
    signal?: AbortSignal
  ): Promise<ReviewConfirmedProcessingReceipt> {
    signal?.throwIfAborted()
    const claim = await this.receipts.claimOrLoadDatabaseApplied(trx, {
      eventVersion: 1,
      payload: event,
    })
    if (!claim.inserted) {
      return claim.receipt
    }

    await this.projectionLock.acquire(event.revieweeId, trx)
    signal?.throwIfAborted()
    await this.assertAuthoritativeSource(event, trx)

    const execCtx = makeSystemReviewActionContext(event.confirmedBy)
    const deferredAuditWrites: TransactionalAuditWrite[] = []
    const transactionOptions = {
      ...(signal ? { signal } : {}),
      deferAuditWrite: (write: TransactionalAuditWrite) => {
        deferredAuditWrites.push(write)
      },
    }
    let skillScoreUpdated: ReviewConfirmedExternalEffects['skillScoreUpdated'] = []
    if (event.action === 'confirmed') {
      for (const reviewerId of event.reviewerIds) {
        signal?.throwIfAborted()
        await new UpdateReviewerCredibilityCommand(
          execCtx,
          this.dependencies.user,
          this.metricsReader
        ).handleInTransaction({ user_id: reviewerId }, trx, signal ? { signal } : {})
      }

      const skillResult = await new RecalculateRevieweeSkillScoresCommand(
        execCtx,
        this.dependencies.userSkill,
        this.metricsReader,
        this.externalEffects
      ).handleInTransaction({ userId: event.revieweeId }, trx, transactionOptions)
      skillScoreUpdated = [...skillResult.deferredSkillScoreUpdatedEvents]

      await new CalculatePerformanceScoreCommand(
        execCtx,
        this.dependencies.user,
        this.metricsReader
      ).handleInTransaction({ userId: event.revieweeId }, trx, transactionOptions)
      await new CalculateTrustScoreCommand(
        execCtx,
        this.dependencies.organization,
        this.dependencies.user,
        this.metricsReader
      ).handleInTransaction({ userId: event.revieweeId }, trx, transactionOptions)
      await this.dependencies.user.refreshProfileAggregates(event.revieweeId, execCtx, {
        trx,
        ...transactionOptions,
      })
    }

    signal?.throwIfAborted()
    const projections = await new ListTalentExplainabilityProjectionsV1Query(
      this.talentSources
    ).execute([event.revieweeId], trx)
    const projection = projections[0]
    const effects: ReviewConfirmedExternalEffects = {
      version: 1,
      skillScoreUpdated,
      talentProjection: projection
        ? {
            ...projection,
            eventType: 'reviews.talent_explainability_projection_changed.v1',
            occurredAt: new Date().toISOString(),
          }
        : null,
    }
    for (const writeAudit of deferredAuditWrites) {
      signal?.throwIfAborted()
      await writeAudit()
    }
    signal?.throwIfAborted()
    return this.receipts.saveExternalEffects(trx, event.confirmationId, effects)
  }

  private async assertAuthoritativeSource(
    event: ReviewConfirmedOutboxPayload,
    trx: ReviewTransaction
  ): Promise<void> {
    const session = await this.sessionReads.findConfirmationSource(event.reviewSessionId, trx)
    if (!session || session.revieweeId !== event.revieweeId) {
      throw new InvariantViolationException(
        'Review confirmed event does not match its authoritative review session'
      )
    }

    const confirmation = session.confirmations.find(
      (entry: ReviewConfirmationEntry) => entry.user_id === event.confirmedBy
    )
    if (!confirmation || confirmation.action !== event.action) {
      throw new InvariantViolationException(
        'Review confirmed event does not match its authoritative confirmation'
      )
    }

    const skillReviews = await this.metricsReader.listSkillReviewsBySession(
      event.reviewSessionId,
      trx
    )
    const reviewerIds = [...new Set(skillReviews.map((review) => review.reviewer_id))].sort()
    if (!sameIdentities(reviewerIds, event.reviewerIds)) {
      throw new InvariantViolationException(
        'Review confirmed event reviewer identities do not match source data'
      )
    }
  }

  private async applyExternalEffects(
    receipt: ReviewConfirmedProcessingReceipt,
    signal?: AbortSignal
  ): Promise<void> {
    if (!receipt.externalEffects) {
      throw new DomainEventDeliveryError('REVIEW_CONFIRMED_EFFECTS_MISSING', false)
    }
    const plan = buildReviewConfirmedExternalEffectPlan(receipt.revieweeId, receipt.externalEffects)
    for (const effect of plan.slice(receipt.externalEffectCursor)) {
      signal?.throwIfAborted()
      await this.deliverExternalEffect(effect)
      signal?.throwIfAborted()
      await this.receipts.advanceExternalEffectCursor({
        confirmationId: receipt.confirmationId,
        expectedCursor: effect.ordinal,
        expectedEffectKey: effect.key,
      })
    }
  }

  private async deliverExternalEffect(
    effect: ReviewConfirmedExternalEffectCheckpoint
  ): Promise<void> {
    switch (effect.kind) {
      case 'skill_score_updated':
        await this.externalEffects.emitSkillScoreUpdated(effect.payload)
        return
      case 'profile_review_cache_invalidation':
        await this.externalEffects.invalidateUserProfileReviewData(effect.payload.revieweeId)
        return
      case 'talent_projection':
        await this.externalEffects.publishTalentProjection(effect.payload)
        return
      default:
        return assertNeverExternalEffect(effect)
    }
  }
}

function assertNeverExternalEffect(effect: never): never {
  throw new DomainEventDeliveryError('REVIEW_CONFIRMED_EFFECT_UNSUPPORTED', false, {
    cause: effect,
  })
}
