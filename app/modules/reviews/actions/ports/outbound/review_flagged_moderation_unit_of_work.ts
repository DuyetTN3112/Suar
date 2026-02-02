import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { FlaggedReviewRecord } from '#modules/reviews/types/review_records'

export interface ResolveFlaggedReviewPersistenceInput {
  flaggedReview: FlaggedReviewRecord
  status: 'dismissed' | 'confirmed'
  reviewedBy: string
  reviewedAt: Date
  notes: string | null
}

export interface ReviewFlaggedModerationPersistenceSession {
  transaction: ReviewTransaction
  findFlaggedReviewForUpdate(flaggedReviewId: string): Promise<FlaggedReviewRecord | null>
  saveResolution(input: ResolveFlaggedReviewPersistenceInput): Promise<FlaggedReviewRecord>
  markSkillReviewAsFraudAndFindReviewee(skillReviewId: string): Promise<string | null>
  stageTalentExplainabilityProjection(input: {
    revieweeUserId: string
    sourceEventId: string
    occurredAt: string
  }): Promise<void>
}

export interface ReviewFlaggedModerationUnitOfWork {
  run<T>(work: (session: ReviewFlaggedModerationPersistenceSession) => Promise<T>): Promise<T>
}
