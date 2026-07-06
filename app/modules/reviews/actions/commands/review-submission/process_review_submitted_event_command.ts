import DetectAnomalyCommand from '../moderation/detect_anomaly_command.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'
import {
  stageDomainEvent,
  type ReviewSubmittedOutboxPayload,
} from '#modules/events/public_contracts/domain_event_outbox'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewAnomalyFlagWriter } from '#modules/reviews/actions/ports/outbound/review_anomaly_flag_writer'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import type {
  ReviewEventSourceReader,
  ReviewSubmittedProcessingReceipt,
  ReviewSubmittedReceiptStore,
} from '#modules/reviews/actions/ports/outbound/review_event_processing'
import type { ReviewUserReaderWriter } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { TalentExplainabilityFactSourceReader } from '#modules/reviews/actions/ports/outbound/review_fact_source_readers'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type { ReviewSessionReadStore } from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import ListTalentExplainabilityProjectionsV1Query from '#modules/reviews/actions/queries/review-core/list_talent_explainability_projections_v1_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { ReviewSubmittedEvent } from '#modules/reviews/events/review_events'

interface DeliveryContext {
  signal?: AbortSignal
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export default class ProcessReviewSubmittedEventCommand extends BaseCommand<
  ReviewSubmittedEvent,
  void
> {
  constructor(
    private readonly userReader: ReviewUserReaderWriter,
    private readonly talentSources: TalentExplainabilityFactSourceReader,
    private readonly cryptography: ReviewCryptography,
    private readonly metricsReader: ReviewMetricsReader,
    private readonly sessionReads: ReviewSessionReadStore,
    private readonly transactionRunner: ReviewTransactionRunner,
    private readonly receipts: ReviewSubmittedReceiptStore,
    private readonly sources: ReviewEventSourceReader,
    private readonly anomalyFlags: ReviewAnomalyFlagWriter
  ) {
    super(makeSystemReviewActionContext('system'), transactionRunner)
  }

  async handle(event: ReviewSubmittedEvent, context: DeliveryContext = {}): Promise<void> {
    const payload: ReviewSubmittedOutboxPayload = {
      submissionId: event.submissionId,
      reviewSessionId: event.reviewSessionId,
      reviewerAssignmentId: event.reviewerAssignmentId,
      reviewerId: event.reviewerId,
      reviewerType: event.reviewerType,
      revieweeId: event.revieweeId,
      taskId: event.taskId,
      skillReviewIds: event.skillReviewIds,
      submittedAt: event.submittedAt,
    }
    try {
      await this.transactionRunner.run((transaction) =>
        this.apply(payload, transaction, context.signal)
      )
    } catch (error) {
      if (error instanceof InvariantViolationException) {
        throw new DomainEventDeliveryError('REVIEW_SUBMITTED_INVARIANT_VIOLATION', false, {
          cause: error,
        })
      }
      throw error
    }
  }

  private async apply(
    payload: ReviewSubmittedOutboxPayload,
    trx: ReviewTransaction,
    signal?: AbortSignal
  ): Promise<ReviewSubmittedProcessingReceipt> {
    signal?.throwIfAborted()
    const claim = await this.receipts.claimOrLoad(trx, payload)
    if (!claim.inserted) return claim.receipt

    await this.assertAuthoritativeSource(payload, trx)
    signal?.throwIfAborted()
    const observedAt = new Date(payload.submittedAt)
    if (Number.isNaN(observedAt.getTime())) {
      throw new InvariantViolationException(
        'Review submitted event has an invalid submission timestamp'
      )
    }
    const flags = await new DetectAnomalyCommand(
      this.execCtx,
      this.userReader,
      this.metricsReader,
      this.sessionReads,
      this.anomalyFlags,
      this.transactionRunner
    ).handleInTransaction(
      {
        reviewSessionId: payload.reviewSessionId,
        reviewerId: payload.reviewerId,
      },
      trx,
      { observedAt, ...(signal ? { signal } : {}) }
    )
    signal?.throwIfAborted()
    const projections = await new ListTalentExplainabilityProjectionsV1Query(
      this.talentSources
    ).execute([payload.revieweeId], trx)
    signal?.throwIfAborted()
    const projection = projections[0]
    if (!projection) {
      throw new InvariantViolationException(
        'Review submitted projection source did not return its reviewee'
      )
    }
    const talentProjection = {
      ...projection,
      eventType: 'reviews.talent_explainability_projection_changed.v1' as const,
      occurredAt: payload.submittedAt,
    }
    await stageDomainEvent(trx, {
      eventName: 'reviews:talent-explainability-projection:changed:v1',
      dedupeKey: this.cryptography.digest(
        `review:submitted:${payload.submissionId}:${projection.sourceRevision}`
      ),
      aggregateType: 'user_talent',
      aggregateId: payload.revieweeId,
      payload: talentProjection,
    })
    signal?.throwIfAborted()
    return this.receipts.complete(trx, payload.submissionId, flags.length, talentProjection)
  }

  private async assertAuthoritativeSource(
    payload: ReviewSubmittedOutboxPayload,
    trx: ReviewTransaction
  ): Promise<void> {
    if (payload.submissionId !== payload.reviewerAssignmentId) {
      throw new InvariantViolationException(
        'Review submitted event submission identity is not authoritative'
      )
    }
    const row = await this.sources.findSubmittedAssignment(payload.reviewerAssignmentId, trx)
    if (
      !row ||
      row.reviewSessionId !== payload.reviewSessionId ||
      row.reviewerId !== payload.reviewerId ||
      row.reviewerType !== payload.reviewerType ||
      row.status !== 'submitted' ||
      row.revieweeId !== payload.revieweeId ||
      row.taskId !== payload.taskId ||
      !row.submittedAt ||
      new Date(row.submittedAt).toISOString() !== new Date(payload.submittedAt).toISOString()
    ) {
      throw new InvariantViolationException(
        'Review submitted event does not match its authoritative assignment'
      )
    }

    const reviews = await this.metricsReader.listSubmittedSkillReviews(
      payload.reviewSessionId,
      payload.reviewerId,
      trx
    )
    const sourceIds = reviews.map((review) => review.id)
    if (!sameIds(sourceIds, payload.skillReviewIds)) {
      throw new InvariantViolationException(
        'Review submitted event skill reviews do not match authoritative source data'
      )
    }
  }
}
