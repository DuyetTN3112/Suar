/**
 * Review Types — Plain data interfaces for review domain rules.
 *
 * 100% pure, no framework dependencies.
 * Used as input to review formula functions.
 */

/**
 * Tier determination result.
 */
export interface TierResult {
  tierCode: string
  tierWeight: number
  tierName: string
}

export interface SkillWeightInput {
  levelCode: string
  reviewerType: 'manager' | 'peer'
  reviewerCredibilityScore: number
  monthsAgo: number
}

export interface SkillConfidenceInput {
  reviewCount: number
  hasManager: boolean
  hasPeer: boolean
  evidenceCount: number
  reviewerCredibilityAverage: number
}

export interface PerformanceScoreInput {
  qualityScore: number
  deliveryScore: number
  difficultyBonus: number
  consistencyScore: number
}

export interface TrustScoreInput {
  reviewConsistency: number
  reviewerCredibility: number
  evidenceCoverage: number
  orgPartnerWeight: number
  volumeRecency: number
}
