import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { FlaggedReviewRecord } from '#modules/reviews/types/review_records'

export interface ReviewAnomalyFlagInput {
  skillReviewId: string
  flagType: string
  severity: string
  notes: string
}

export interface ReviewAnomalyFlagWriter {
  createIfMissing(
    input: ReviewAnomalyFlagInput,
    transaction: ReviewTransaction
  ): Promise<FlaggedReviewRecord>
}
