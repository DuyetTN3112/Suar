import type {
  ReviewAnomalyFlagInput,
  ReviewAnomalyFlagWriter,
} from '#modules/reviews/actions/ports/outbound/review_anomaly_flag_writer'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import FlaggedReviewRepository from '#modules/reviews/infra/repositories/review-core/flagged_review_repository'
import type { FlaggedReviewRecord } from '#modules/reviews/types/review_records'

export default class LucidReviewAnomalyFlagWriter implements ReviewAnomalyFlagWriter {
  createIfMissing(
    input: ReviewAnomalyFlagInput,
    transaction: ReviewTransaction
  ): Promise<FlaggedReviewRecord> {
    return FlaggedReviewRepository.createAnomalyIfMissing(
      {
        skill_review_id: input.skillReviewId,
        flag_type: input.flagType,
        severity: input.severity,
        status: 'pending',
        notes: input.notes,
      },
      toLucidReviewTransaction(transaction)
    )
  }
}
