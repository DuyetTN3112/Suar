import { DateTime } from 'luxon'

import { BaseCommand } from '#modules/reputation/actions/base_command'
import { calculateCredibilityScore } from '#modules/reputation/domain/reputation_formulas'
import type {
  ReviewerCredibilityResult,
  UpdateReviewerCredibilityDTO,
} from '#modules/reputation/public_contracts/reputation_contracts'
import type { ReviewUserReaderWriter } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export type { ReviewerCredibilityResult, UpdateReviewerCredibilityDTO }

/**
 * Command: Update Reviewer Credibility
 *
 * Mastered in reputation bounded context.
 * Credibility data stored as JSONB credibility_data on users table.
 *
 * Pattern: FETCH → DECIDE (pure formula) → PERSIST
 */
export default class UpdateReviewerCredibilityCommand extends BaseCommand<
  UpdateReviewerCredibilityDTO,
  ReviewerCredibilityResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly userWriter: ReviewUserReaderWriter,
    private readonly metricsReader: ReviewMetricsReader,
    transactions?: ReviewTransactionRunner
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: UpdateReviewerCredibilityDTO): Promise<ReviewerCredibilityResult> {
    return await this.executeInTransaction((trx) => this.handleInTransaction(dto, trx))
  }

  async handleInTransaction(
    dto: UpdateReviewerCredibilityDTO,
    trx: ReviewTransaction,
    options: { signal?: AbortSignal } = {}
  ): Promise<ReviewerCredibilityResult> {
    options.signal?.throwIfAborted()

    // ── FETCH ──────────────────────────────────────────────────────────
    const totalReviews = await this.metricsReader.countCompletedReviewsByReviewer(dto.user_id, trx)
    const confirmed = await this.metricsReader.countConfirmedReviewsByReviewer(dto.user_id, trx)
    const disputed = await this.metricsReader.countDisputedReviewsByReviewer(dto.user_id, trx)

    // ── DECIDE (pure, sync) ────────────────────────────────────────────
    const score = calculateCredibilityScore(totalReviews, confirmed, disputed)

    // ── PERSIST ────────────────────────────────────────────────────────
    await this.userWriter.updateCredibilityData(
      dto.user_id,
      {
        credibility_score: score,
        total_reviews_given: totalReviews,
        accurate_reviews: confirmed,
        disputed_reviews: disputed,
        last_calculated_at: DateTime.now().toISO(),
      },
      trx
    )

    const result = {
      credibility_score: score,
      total_reviews: totalReviews,
    }
    options.signal?.throwIfAborted()
    return result
  }
}
