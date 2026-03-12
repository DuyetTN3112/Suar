import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { SkillReviewRecord } from '#modules/reviews/types/review_records'

export interface ReviewPerformanceAssignmentRow {
  id: string
  completed_at: string | Date | null
  actual_hours: number | string | null
  due_date: string | Date | null
  difficulty: string | null
}

export interface ReviewPerformanceQualityRow {
  overall_quality_score: number | string
}

export interface ReviewTrustSessionRow {
  id: string
  created_at: string | Date
}

export interface ReviewTrustSignalRow {
  review_session_id: string
  reviewer_type: 'manager' | 'peer'
  assigned_public_proficiency_code: string
  reviewer_credibility_score: number | string
}

export interface ReviewCountRow {
  total: number | string
}

export interface ReviewSkillAggregationRow {
  skill_id: string
  review_session_id: string
  reviewer_type: 'manager' | 'peer'
  assigned_public_proficiency_code: string
  reviewer_credibility_score: number | string
  created_at: string | Date
}

export interface ReviewSkillEvidenceCountRow extends ReviewCountRow {
  skill_id: string
}

/**
 * Persistence-facing read contract for score calculation use cases.
 *
 * The command owns calculation and workflow ordering; the adapter owns SQL.
 */
export interface ReviewMetricsReader {
  countCompletedReviewsByReviewer(
    reviewerId: string,
    transaction: ReviewTransaction
  ): Promise<number>

  countConfirmedReviewsByReviewer(
    reviewerId: string,
    transaction: ReviewTransaction
  ): Promise<number>

  countDisputedReviewsByReviewer(
    reviewerId: string,
    transaction: ReviewTransaction
  ): Promise<number>

  calculateSkillAveragePercentage(
    userId: string,
    skillId: string,
    transaction: ReviewTransaction
  ): Promise<{ avgPercentage: number; totalReviews: number }>

  listSubmittedSkillReviews(
    reviewSessionId: string,
    reviewerId: string,
    transaction: ReviewTransaction
  ): Promise<SkillReviewRecord[]>

  listSkillReviewsBySession(
    reviewSessionId: string,
    transaction: ReviewTransaction
  ): Promise<SkillReviewRecord[]>

  countCompletedHighReviewsBetweenUsers(
    reviewerId: string,
    revieweeId: string,
    transaction: ReviewTransaction,
    submittedAtOrBefore?: Date
  ): Promise<number>

  listCompletedAssignmentsForPerformance(
    userId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewPerformanceAssignmentRow[]>

  listCompletedSessionQualityRows(
    userId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewPerformanceQualityRow[]>

  listCompletedSessionsForTrust(
    userId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewTrustSessionRow[]>

  listSkillReviewTrustRows(
    sessionIds: string[],
    transaction: ReviewTransaction
  ): Promise<ReviewTrustSignalRow[]>

  countSessionsWithEvidence(
    sessionIds: string[],
    transaction: ReviewTransaction
  ): Promise<ReviewCountRow[]>

  listCompletedSkillReviewRowsByReviewee(
    userId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewSkillAggregationRow[]>

  listEvidenceCountsBySkill(
    userId: string,
    transaction: ReviewTransaction
  ): Promise<ReviewSkillEvidenceCountRow[]>
}
