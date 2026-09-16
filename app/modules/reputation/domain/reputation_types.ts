/**
 * Reputation Domain Types — Plain data interfaces for reputation and scoring domain rules.
 *
 * 100% pure, no framework dependencies.
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
