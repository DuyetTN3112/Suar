/**
 * Review Formulas — Pure business calculations for the 360-degree review system.
 *
 * Extracted from:
 *   - confirm_review_command.ts (credibility adjustment)
 *   - calculate_trust_score_command.ts (trust score, raw score, tier)
 *   - update_reviewer_credibility_command.ts (full credibility recalculation)
 *   - submit_skill_review_command.ts (session status determination)
 *
 * All functions are synchronous, pure, and have 0 framework dependencies.
 * They can be tested without a database.
 *
 * @module ReviewFormulas
 */

import { TrustTierCode, TRUST_TIER_WEIGHTS } from '#constants/user_constants'
import { ReviewSessionStatus } from '#constants/review_constants'
import type { TierResult } from './review_types.js'

// ============================================================================
// Credibility Score
// ============================================================================

/**
 * Incremental credibility adjustment.
 * Called when a reviewee confirms or disputes a review.
 *
 * confirmed → +2 (max 100)
 * disputed  → -5 (min 0)
 *
 * Source: confirm_review_command.ts L79-84
 */
export function adjustCredibility(currentScore: number, action: 'confirmed' | 'disputed'): number {
  if (action === 'confirmed') {
    return Math.min(100, currentScore + 2)
  }
  return Math.max(0, currentScore - 5)
}

/**
 * Full credibility recalculation from review counts.
 *
 * Formula: 50 + (confirmed/total)*40 - (disputed/total)*30
 * Clamped to [0, 100], rounded to 2 decimal places.
 *
 * Source: update_reviewer_credibility_command.ts L58-62
 */
export function calculateCredibilityScore(
  totalReviews: number,
  confirmed: number,
  disputed: number
): number {
  if (totalReviews === 0) return 50.0
  let score = 50.0 + (confirmed / totalReviews) * 40 - (disputed / totalReviews) * 30
  score = Math.max(0, Math.min(100, score))
  return Math.round(score * 100) / 100
}

// ============================================================================
// Trust Score
// ============================================================================

/**
 * Weighted trust score = rawScore * tierWeight.
 * Rounded to 2 decimal places.
 *
 * Source: calculate_trust_score_command.ts L59
 */
export function calculateWeightedTrustScore(rawScore: number, tierWeight: number): number {
  return Math.round(rawScore * tierWeight * 100) / 100
}

/**
 * Average raw score from skill percentages.
 * Returns 0 for empty input.
 *
 * Source: calculate_trust_score_command.ts L107-109
 */
export function calculateRawScore(skillPercentages: number[]): number {
  if (skillPercentages.length === 0) return 0
  const total = skillPercentages.reduce((sum, p) => sum + p, 0)
  return Math.round((total / skillPercentages.length) * 100) / 100
}

/**
 * Determine the highest trust tier for a user based on organization memberships.
 *
 * Tier hierarchy: PARTNER (1.00) > ORGANIZATION (0.80) > COMMUNITY (0.50)
 *
 * Source: calculate_trust_score_command.ts L134-155
 */
export function determineTier(hasOrgMembership: boolean, belongsToPartnerOrg: boolean): TierResult {
  if (belongsToPartnerOrg) {
    return {
      tierCode: TrustTierCode.PARTNER,
      tierWeight: TRUST_TIER_WEIGHTS[TrustTierCode.PARTNER],
      tierName: 'Partner-Verified',
    }
  }
  if (hasOrgMembership) {
    return {
      tierCode: TrustTierCode.ORGANIZATION,
      tierWeight: TRUST_TIER_WEIGHTS[TrustTierCode.ORGANIZATION],
      tierName: 'Org-Verified',
    }
  }
  return {
    tierCode: TrustTierCode.COMMUNITY,
    tierWeight: TRUST_TIER_WEIGHTS[TrustTierCode.COMMUNITY],
    tierName: 'Community-Verified',
  }
}

// ============================================================================
// Review Session Status
// ============================================================================

/**
 * Determine review session status based on completion state.
 *
 * Rules:
 * - If manager reviewed AND peer count >= required → COMPLETED
 * - If currently pending → IN_PROGRESS (first review submitted)
 * - Otherwise → keep current status
 *
 * Source: submit_skill_review_command.ts L80-88
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
