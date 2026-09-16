/**
 * Reputation Public Contracts
 *
 * Defines the public interfaces, DTOs, and results for the Reputation Bounded Context.
 */

export interface TrustScoreResult {
  userId: string
  rawScore: number
  calculatedScore: number
  tierCode: string
  tierName: string
  totalVerifiedReviews: number
}

export interface CalculateTrustScoreDTO {
  userId: string
}

export interface ReviewerCredibilityResult {
  credibility_score: number
  total_reviews: number
}

export interface UpdateReviewerCredibilityDTO {
  user_id: string
}

export interface SpiderChartResult {
  userId: string
  skillsCalculated: number
  totalReviews: number
}

export interface CalculateSpiderChartDTO {
  userId: string
}

export interface PerformanceScoreResult {
  userId: string
  score: number
  version: string
  metrics: {
    qualityScore: number
    deliveryScore: number
    difficultyBonus: number
    consistencyScore: number
  }
}

export interface CalculatePerformanceScoreDTO {
  userId: string
}

export interface RecalculateSkillScoresResult {
  userId: string
  skillsUpdated: number
  deferredSkillScoreUpdatedEvents: Array<{
    userId: string
    skillId: string
    oldScore: number
    newScore: number
  }>
}

export interface RecalculateSkillScoresDTO {
  userId: string
}
