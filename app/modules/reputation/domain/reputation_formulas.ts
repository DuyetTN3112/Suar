/**
 * Reputation Formulas — Pure business calculations for Trust Score, Credibility,
 * Performance Score, and Spider Chart aggregations.
 *
 * All functions are synchronous, pure, and have 0 framework dependencies.
 *
 * @module ReputationFormulas
 */

import type {
  PerformanceScoreInput,
  SkillConfidenceInput,
  SkillWeightInput,
  TierResult,
  TrustScoreInput,
} from './reputation_types.js'

import {
  getCanonicalProficiencyLevelOrder,
  getCanonicalProficiencyLevelValueFromPercentage,
  listCanonicalProficiencyLevelOptions,
} from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import { TrustTierCode, TRUST_TIER_WEIGHTS } from '#modules/users/public_contracts/user_constants'

// ============================================================================
// Credibility Score
// ============================================================================

/**
 * Incremental credibility adjustment.
 * Called when a reviewee confirms or disputes a review.
 *
 * confirmed → +2 (max 100)
 * disputed  → -5 (min 0)
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
 */
export function calculateWeightedTrustScore(rawScore: number, tierWeight: number): number {
  return Math.round(rawScore * tierWeight * 100) / 100
}

/**
 * Average raw score from skill percentages.
 * Returns 0 for empty input.
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
// Skill Aggregations & Confidence
// ============================================================================

export const SKILL_AGGREGATION_SCORING_VERSION = 'skill_aggregation_v1' as const

export function mapLevelCodeToNumber(levelCode: string): number {
  return getCanonicalProficiencyLevelOrder(levelCode)
}

export function mapWeightedScoreToLevelCode(score: number): string {
  const options = listCanonicalProficiencyLevelOptions()
  const clampedScore = Math.max(1, Math.min(options.length, Math.round(score)))
  return options[clampedScore - 1]?.value ?? 'l0'
}

export function calculateSkillWeightedScore(inputs: SkillWeightInput[]): number {
  if (inputs.length === 0) return 0

  let weightedTotal = 0
  let weightSum = 0

  for (const item of inputs) {
    const levelNum = mapLevelCodeToNumber(item.levelCode)
    const typeWeight = item.reviewerType === 'manager' ? 1.5 : 1.0
    const credibilityWeight = Math.max(0, Math.min(1, item.reviewerCredibilityScore / 100))
    const timeWeight = Math.max(0.3, 1.0 - (item.monthsAgo / 24) * 0.7)
    const finalWeight = typeWeight * credibilityWeight * timeWeight

    weightedTotal += levelNum * finalWeight
    weightSum += finalWeight
  }

  if (weightSum === 0) return 0
  return Math.round((weightedTotal / weightSum) * 100) / 100
}

export function calculateSkillConfidence(input: SkillConfidenceInput): number {
  const reviewVolume = Math.max(0, Math.min(1, input.reviewCount / 8))
  const coverage =
    input.hasManager && input.hasPeer ? 1.0 : input.hasManager || input.hasPeer ? 0.6 : 0
  const evidence = Math.max(0, Math.min(1, input.evidenceCount / 3))
  const credibility = Math.max(0, Math.min(1, input.reviewerCredibilityAverage / 100))

  const confidence =
    (reviewVolume * 0.35 + coverage * 0.25 + evidence * 0.2 + credibility * 0.2) * 100

  return Math.round(confidence * 10) / 10
}

export function calculatePerformanceScore(input: PerformanceScoreInput): number {
  const score =
    input.qualityScore * 0.35 +
    input.deliveryScore * 0.3 +
    input.difficultyBonus * 0.2 +
    input.consistencyScore * 0.15

  return Math.max(0, Math.min(100, Math.round(score * 10) / 10))
}

export function calculateTrustScoreV2(input: TrustScoreInput): number {
  const score =
    input.reviewConsistency * 0.25 +
    input.reviewerCredibility * 0.25 +
    input.evidenceCoverage * 0.2 +
    input.orgPartnerWeight * 0.15 +
    input.volumeRecency * 0.15

  return Math.max(0, Math.min(100, Math.round(score * 10) / 10))
}

// ============================================================================
// Proficiency Level Mapping
// ============================================================================

export function getLevelCodeFromPercentage(percentage: number): string {
  return getCanonicalProficiencyLevelValueFromPercentage(percentage)
}
