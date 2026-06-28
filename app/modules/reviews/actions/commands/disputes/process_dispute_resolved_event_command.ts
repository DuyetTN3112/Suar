import CalculatePerformanceScoreCommand from '../review-core/calculate_performance_score_command.js'
import CalculateTrustScoreCommand from '../review-core/calculate_trust_score_command.js'
import RecalculateRevieweeSkillScoresCommand from '../review-submission/recalculate_reviewee_skill_scores_command.js'
import UpdateReviewerCredibilityCommand from '../review-submission/update_reviewer_credibility_command.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'
import type { DisputeResolvedOutboxPayload } from '#modules/events/public_contracts/domain_event_outbox'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { TransactionalAuditWrite } from '#modules/reviews/actions/dtos/request/transactional_audit_options'
import type {
  DisputeResolvedReceiptStore,
  ReviewEventSourceReader,
  ReviewProjectionLock,
} from '#modules/reviews/actions/ports/outbound/review_event_processing'
import type { ReviewExternalDependencies } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import type { TalentExplainabilityFactSourceReader } from '#modules/reviews/actions/ports/outbound/review_fact_source_readers'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import ListTalentExplainabilityProjectionsV1Query from '#modules/reviews/actions/queries/review-core/list_talent_explainability_projections_v1_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  DisputeResolvedReceiptCollisionException,
  type DisputeResolvedProcessingReceipt,
} from '#modules/reviews/public_contracts/dispute_resolved_processing_receipt'
import {
  buildReviewConfirmedExternalEffectPlan,
  type ReviewConfirmedExternalEffectCheckpoint,
  type ReviewConfirmedExternalEffects,
} from '#modules/reviews/public_contracts/review_confirmed_processing_receipt'
import {
  PROFILE_UPDATE_ACTION,
  REVIEWER_CREDIBILITY_ACTION,
} from '#modules/reviews/public_contracts/review_constants'

interface DeliveryContext {
  signal?: AbortSignal
}

function externalFailureCode(error: unknown): string {
  return error instanceof DomainEventDeliveryError
    ? error.errorCode
    : 'DISPUTE_RESOLVED_EXTERNAL_EFFECT_FAILED'
}

function permanentError(error: unknown): DomainEventDeliveryError | null {
  if (error instanceof DisputeResolvedReceiptCollisionException) {
    return new DomainEventDeliveryError('DISPUTE_RESOLVED_RECEIPT_COLLISION', false, {
      cause: error,
    })
  }
  if (error instanceof InvariantViolationException) {
    return new DomainEventDeliveryError('DISPUTE_RESOLVED_INVARIANT_VIOLATION', false, {
      cause: error,
    })
  }
  return null
}

function sameIdentities(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export default class ProcessDisputeResolvedEventCommand extends BaseCommand<
  DisputeResolvedOutboxPayload,
  void
> {
  constructor(
    private readonly dependencies: Pick<
      ReviewExternalDependencies,
      'organization' | 'user' | 'userSkill'
    >,
    private readonly metricsReader: ReviewMetricsReader,
    private readonly externalEffects: ReviewExternalEffectPublisher,
    private readonly talentSources: TalentExplainabilityFactSourceReader,
    private readonly transactionRunner: ReviewTransactionRunner,
    private readonly receipts: DisputeResolvedReceiptStore,
    private readonly projectionLock: ReviewProjectionLock,
    private readonly sources: ReviewEventSourceReader
  ) {
    super(makeSystemReviewActionContext('system'))
  }

  override async handle(
    event: DisputeResolvedOutboxPayload,
    context: DeliveryContext = {}
  ): Promise<void> {
    const signal = context.signal
    const payload: DisputeResolvedOutboxPayload = {
      disputeId: event.disputeId,
      reviewSessionId: event.reviewSessionId,
      revieweeId: event.revieweeId,
      reviewerIds: event.reviewerIds,
      resolvedBy: event.resolvedBy,
      finalDecision: event.finalDecision,
      ...(event.profileUpdateAction !== undefined
        ? { profileUpdateAction: event.profileUpdateAction }
        : {}),
      ...(event.reviewerCredibilityAction !== undefined
        ? { reviewerCredibilityAction: event.reviewerCredibilityAction }
        : {}),
    }
    signal?.throwIfAborted()
    let receipt: DisputeResolvedProcessingReceipt
    try {
      receipt = await this.transactionRunner.run((transaction) =>
        this.applyDatabasePhase(payload, transaction, signal)
      )
    } catch (error) {
      const permanent = permanentError(error)
      if (permanent) throw permanent
      throw error
    }
    if (receipt.state === 'completed') return
    if (!receipt.externalEffects) {
      throw new DomainEventDeliveryError('DISPUTE_RESOLVED_EFFECTS_MISSING', false)
    }

    try {
      await this.applyExternalEffects(receipt, signal)
    } catch (error) {
      try {
        await this.receipts.recordExternalFailure(payload.disputeId, externalFailureCode(error))
      } catch {
        // Preserve the delivery error; the durable outbox remains authoritative.
      }
      throw error
    }
  }

  private async applyDatabasePhase(
    payload: DisputeResolvedOutboxPayload,
    trx: ReviewTransaction,
    signal?: AbortSignal
  ): Promise<DisputeResolvedProcessingReceipt> {
    signal?.throwIfAborted()
    const claim = await this.receipts.claimOrLoadDatabaseApplied(trx, payload)
    if (!claim.inserted) return claim.receipt

    await this.projectionLock.acquire(payload.revieweeId, trx)
    signal?.throwIfAborted()
    await this.assertAuthoritativeSource(payload, trx)

    const execCtx = makeSystemReviewActionContext(payload.resolvedBy)
    const deferredAudits: TransactionalAuditWrite[] = []
    const transactionOptions = {
      ...(signal ? { signal } : {}),
      deferAuditWrite: (write: TransactionalAuditWrite) => {
        deferredAudits.push(write)
      },
    }
    if (payload.reviewerCredibilityAction === REVIEWER_CREDIBILITY_ACTION.MARK_DISPUTED) {
      for (const reviewerId of payload.reviewerIds) {
        signal?.throwIfAborted()
        await new UpdateReviewerCredibilityCommand(
          execCtx,
          this.dependencies.user,
          this.metricsReader
        ).handleInTransaction({ user_id: reviewerId }, trx, signal ? { signal } : {})
      }
    }

    let skillScoreUpdated: ReviewConfirmedExternalEffects['skillScoreUpdated'] = []
    if (payload.profileUpdateAction === PROFILE_UPDATE_ACTION.RECALCULATE) {
      const skillResult = await new RecalculateRevieweeSkillScoresCommand(
        execCtx,
        this.dependencies.userSkill,
        this.metricsReader,
        this.externalEffects
      ).handleInTransaction({ userId: payload.revieweeId }, trx, transactionOptions)
      skillScoreUpdated = [...skillResult.deferredSkillScoreUpdatedEvents]
      await new CalculatePerformanceScoreCommand(
        execCtx,
        this.dependencies.user,
        this.metricsReader
      ).handleInTransaction({ userId: payload.revieweeId }, trx, transactionOptions)
      await new CalculateTrustScoreCommand(
        execCtx,
        this.dependencies.organization,
        this.dependencies.user,
        this.metricsReader
      ).handleInTransaction({ userId: payload.revieweeId }, trx, transactionOptions)
      await this.dependencies.user.refreshProfileAggregates(payload.revieweeId, execCtx, {
        trx,
        ...transactionOptions,
      })
    }

    signal?.throwIfAborted()
    const projections = await new ListTalentExplainabilityProjectionsV1Query(
      this.talentSources
    ).execute([payload.revieweeId], trx)
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
    for (const writeAudit of deferredAudits) {
      signal?.throwIfAborted()
      await writeAudit()
    }
    signal?.throwIfAborted()
    return this.receipts.saveExternalEffects(trx, payload.disputeId, effects)
  }

  private async assertAuthoritativeSource(
    payload: DisputeResolvedOutboxPayload,
    trx: ReviewTransaction
  ): Promise<void> {
    const dispute = await this.sources.findResolvedDispute(
      payload.disputeId,
      payload.reviewSessionId,
      trx
    )
    if (
      !dispute ||
      dispute.status !== 'resolved' ||
      dispute.reviewSessionId !== payload.reviewSessionId ||
      dispute.revieweeId !== payload.revieweeId ||
      dispute.resolvedBy !== payload.resolvedBy ||
      dispute.finalDecision !== payload.finalDecision ||
      dispute.profileUpdateAction !== (payload.profileUpdateAction ?? null) ||
      dispute.reviewerCredibilityAction !== (payload.reviewerCredibilityAction ?? null)
    ) {
      throw new InvariantViolationException(
        'Dispute resolved event does not match its authoritative dispute'
      )
    }
    if (!sameIdentities(dispute.reviewerIds, payload.reviewerIds)) {
      throw new InvariantViolationException(
        'Dispute resolved event reviewer identities do not match source data'
      )
    }
  }

  private async applyExternalEffects(
    receipt: DisputeResolvedProcessingReceipt,
    signal?: AbortSignal
  ): Promise<void> {
    if (!receipt.externalEffects) {
      throw new DomainEventDeliveryError('DISPUTE_RESOLVED_EFFECTS_MISSING', false)
    }
    const plan = buildReviewConfirmedExternalEffectPlan(
      receipt.payload.revieweeId,
      receipt.externalEffects
    )
    for (const effect of plan.slice(receipt.externalEffectCursor)) {
      signal?.throwIfAborted()
      await this.deliverExternalEffect(effect)
      signal?.throwIfAborted()
      await this.receipts.advanceExternalEffectCursor({
        disputeId: receipt.disputeId,
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
        return assertNeverEffect(effect)
    }
  }
}

function assertNeverEffect(effect: never): never {
  throw new DomainEventDeliveryError('DISPUTE_RESOLVED_EFFECT_UNSUPPORTED', false, {
    cause: effect,
  })
}
