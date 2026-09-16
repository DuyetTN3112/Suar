/**
 * Review Formulas — Pure business calculations for the 360-degree review system.
 *
 * Core review session formulas: session status and quorum satisfaction.
 * Reputation math is mastered in #modules/reputation/domain/reputation_formulas.
 *
 * @module ReviewFormulas
 */

import { ReviewSessionStatus } from '#modules/reviews/public_contracts/review_constants'


// ============================================================================
// Review Session Status & Quorum (Core Review Domain)
// ============================================================================

/**
 * Determine review session status based on completion state.
 *
 * Rules:
 * - If manager reviewed AND peer count >= required → COMPLETED
 * - If currently pending → IN_PROGRESS (first review submitted)
 * - Otherwise → keep current status
 */
export function determineSessionStatus(
  managerReviewCompleted: boolean,
  peerReviewsCount: number,
  requiredPeerReviews: number,
  currentStatus: string
): 'pending' | 'in_progress' | 'completed' | 'disputed' {
  if (managerReviewCompleted && peerReviewsCount >= requiredPeerReviews) {
    return ReviewSessionStatus.COMPLETED
  }
  if (currentStatus === 'pending') {
    return ReviewSessionStatus.IN_PROGRESS
  }
  return currentStatus as 'pending' | 'in_progress' | 'completed' | 'disputed'
}

export function isReviewSessionQuorumSatisfied(input: {
  creatorReviewCompleted: boolean
  managerReviewsCount: number
  peerReviewsCount: number
  requiredTotalReviews: number
  minimumManagerReviews: number
  minimumPeerReviews: number
}): boolean {
  const totalDistinctReviews = input.managerReviewsCount + input.peerReviewsCount

  return (
    input.creatorReviewCompleted &&
    input.managerReviewsCount >= input.minimumManagerReviews &&
    input.peerReviewsCount >= input.minimumPeerReviews &&
    totalDistinctReviews >= input.requiredTotalReviews
  )
}

