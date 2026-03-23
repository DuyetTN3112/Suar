import type {
  ReviewCountRow,
  ReviewMetricsReader,
  ReviewPerformanceAssignmentRow,
  ReviewPerformanceQualityRow,
  ReviewSkillAggregationRow,
  ReviewSkillEvidenceCountRow,
  ReviewTrustSessionRow,
  ReviewTrustSignalRow,
} from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/lucid_review_transaction_runner'
import ReviewMetricsRepository from '#modules/reviews/infra/repositories/review_metrics_repository'
import SkillReviewRepository from '#modules/reviews/infra/repositories/skill_review_repository'
import type { SkillReviewRecord } from '#modules/reviews/types/review_records'

export class LucidReviewMetricsReader implements ReviewMetricsReader {
  async countCompletedReviewsByReviewer(
    reviewerId: string,
    transaction: ReviewTransaction
  ): Promise<number> {
    return SkillReviewRepository.countCompletedByReviewer(
      reviewerId,
      toLucidReviewTransaction(transaction)
    )
  }

  async countConfirmedReviewsByReviewer(
    reviewerId: string,
    transaction: ReviewTransaction
  ): Promise<number> {
    return SkillReviewRepository.countConfirmedByReviewer(
      reviewerId,
      toLucidReviewTransaction(transaction)
    )
  }

  async countDisputedReviewsByReviewer(
    reviewerId: string,
    transaction: ReviewTransaction
  ): Promise<number> {
    return SkillReviewRepository.countDisputedByReviewer(
      reviewerId,
      toLucidReviewTransaction(transaction)
    )
  }

  async calculateSkillAveragePercentage(
    userId: string,
    skillId: string,
    transaction: ReviewTransaction
  ): Promise<{ avgPercentage: number; totalReviews: number }> {
    return SkillReviewRepository.calculateSkillAvgPercentage(
      userId,
      skillId,
      toLucidReviewTransaction(transaction)
    )
  }

  async listSubmittedSkillReviews(
    reviewSessionId: string,
    reviewerId: string,
    transaction: ReviewTransaction
  ): Promise<SkillReviewRecord[]> {
    return SkillReviewRepository.listSubmittedBySessionAndReviewer(
      reviewSessionId,
      reviewerId,
      toLucidReviewTransaction(transaction)
    )
  }

  async listSkillReviewsBySession(
    reviewSessionId: string,
    transaction: ReviewTransaction
  ): Promise<SkillReviewRecord[]> {
    return SkillReviewRepository.listBySession(
      reviewSessionId,
      toLucidReviewTransaction(transaction)
    )
  }

  async countCompletedHighReviewsBetweenUsers(
    reviewerId: string,
    revieweeId: string,
    transaction: ReviewTransaction,
    submittedAtOrBefore?: Date
  ): Promise<number> {
    return SkillReviewRepository.countCompletedHighReviewsBetweenUsers(
      reviewerId,
      revieweeId,
      toLucidReviewTransaction(transaction),
      submittedAtOrBefore
    )
  }

  async listCompletedAssignmentsForPerformance(
    userId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewPerformanceAssignmentRow[]> {
    return (await ReviewMetricsRepository.listCompletedAssignmentsForPerformance(
      userId,
      toLucidReviewTransaction(transaction)
    )) as ReviewPerformanceAssignmentRow[]
  }

  async listCompletedSessionQualityRows(
    userId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewPerformanceQualityRow[]> {
    return (await ReviewMetricsRepository.listCompletedSessionQualityRows(
      userId,
      toLucidReviewTransaction(transaction)
    )) as ReviewPerformanceQualityRow[]
  }

  async listCompletedSessionsForTrust(
    userId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewTrustSessionRow[]> {
    return (await ReviewMetricsRepository.listCompletedSessionsForTrust(
      userId,
      toLucidReviewTransaction(transaction)
    )) as ReviewTrustSessionRow[]
  }

  async listSkillReviewTrustRows(
    sessionIds: string[],
    transaction: ReviewTransaction
  ): Promise<ReviewTrustSignalRow[]> {
    return (await ReviewMetricsRepository.listSkillReviewTrustRows(
      sessionIds,
      toLucidReviewTransaction(transaction)
    )) as ReviewTrustSignalRow[]
  }

  async countSessionsWithEvidence(
    sessionIds: string[],
    transaction: ReviewTransaction
  ): Promise<ReviewCountRow[]> {
    return (await ReviewMetricsRepository.countSessionsWithEvidence(
      sessionIds,
      toLucidReviewTransaction(transaction)
    )) as ReviewCountRow[]
  }

  async listCompletedSkillReviewRowsByReviewee(
    userId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewSkillAggregationRow[]> {
    return (await ReviewMetricsRepository.listCompletedSkillReviewRowsByReviewee(
      userId,
      toLucidReviewTransaction(transaction)
    )) as ReviewSkillAggregationRow[]
  }

  async listEvidenceCountsBySkill(
    userId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewSkillEvidenceCountRow[]> {
    return (await ReviewMetricsRepository.listEvidenceCountsBySkill(
      userId,
      toLucidReviewTransaction(transaction)
    )) as ReviewSkillEvidenceCountRow[]
  }
}
