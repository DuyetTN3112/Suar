import type { DateTime } from 'luxon'

import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ReviewUserAccountInfo {
  id: string
  createdAtMillis: number
}

export interface ReviewModeratorIdentity {
  id: string
  username: string
  email: string | null
}

export interface ReviewModeratorIdentityReader {
  findByIds(
    userIds: string[],
    trx?: ReviewTransaction
  ): Promise<ReviewModeratorIdentity[]>

  findIdsByUsername(username: string): Promise<string[]>
}

export interface ReviewActorAccessInfo {
  systemRole: string | null
}

export interface ReviewOrganizationMembershipInfo {
  role: string
  status: string
}

export interface ReviewActorAccessReader {
  findActorAccess(
    userId: string,
    trx?: ReviewTransaction
  ): Promise<ReviewActorAccessInfo | null>

  findOrganizationMembership(
    userId: string,
    organizationId: string,
    trx?: ReviewTransaction
  ): Promise<ReviewOrganizationMembershipInfo | null>
}

export interface ReviewUserTrustData {
  current_tier_code: string | null
  calculated_score: number
  raw_score: number
  total_verified_reviews: number
  last_calculated_at: string | null
  scoring_version?: string
  performance_score?: number
  performance_breakdown?: {
    quality_score: number
    delivery_score: number
    difficulty_bonus: number
    consistency_score: number
    calculated_at: string | null
  }
}

export interface ReviewUserCredibilityData {
  credibility_score: number
  total_reviews_given: number
  accurate_reviews: number
  disputed_reviews: number
  last_calculated_at: string | null
}

export interface LifetimePerformanceStatsPayload {
  totalCompletedAssignments: number
  totalHoursWorked: number
  qualityMean: number
  deliveryScore: number
  performanceScore: number
  calculatedAt: DateTime
}

export interface ReviewedSkillScorePayload {
  levelCode: string
  totalReviews: number
  avgScore: number
  avgPercentage: number
  confidence: number | null
  evidenceCount: number
  lastReviewedAt: DateTime | null
}

export interface SpiderChartSkillPayload {
  avgPercentage: number
  levelCode: string
}

export interface PersistedSkillScoreResult {
  oldScore: number | null
}

export interface ReviewSkillInfo {
  id: string
  name: string
  categoryCode: string
  is_active: boolean
}

export interface ReviewActiveSkillOption {
  id: string
  skill_name: string
  skill_code?: string
  category_code: string | null
}

export interface ReviewOrganizationReader {
  listOrganizationIdsByUser(userId: string, trx?: ReviewTransaction): Promise<string[]>

  hasAnyActivePartnerByIds(
    organizationIds: string[],
    trx?: ReviewTransaction
  ): Promise<boolean>

  isApprovedMember(userId: string, organizationId: string): Promise<boolean>
}

export interface ReviewUserReaderWriter {
  findAccountInfo(
    userId: string,
    trx?: ReviewTransaction
  ): Promise<ReviewUserAccountInfo | null>

  mergeTrustData(
    userId: string,
    trustData: Partial<ReviewUserTrustData>,
    trx?: ReviewTransaction
  ): Promise<void>

  updateCredibilityData(
    userId: string,
    credibilityData: ReviewUserCredibilityData,
    trx?: ReviewTransaction
  ): Promise<void>

  upsertLifetimePerformanceStats(
    userId: string,
    payload: LifetimePerformanceStatsPayload,
    trx?: ReviewTransaction
  ): Promise<void>

  refreshProfileAggregates(
    userId: string,
    execCtx: ReviewActionContext,
    options: {
      trx: ReviewTransaction
      signal?: AbortSignal
      deferAuditWrite?: (write: () => Promise<void>) => void
    }
  ): Promise<void>
}

export interface ReviewUserSkillWriter {
  upsertReviewedSkillScore(
    userId: string,
    skillId: string,
    payload: ReviewedSkillScorePayload,
    trx?: ReviewTransaction
  ): Promise<PersistedSkillScoreResult>

  upsertSpiderChartSkillData(
    userId: string,
    skillId: string,
    payload: SpiderChartSkillPayload,
    trx?: ReviewTransaction
  ): Promise<void>
}

export interface ReviewSkillReader {
  listActiveSkills(): Promise<ReviewActiveSkillOption[]>

  listSpiderChartSkillIds(trx?: ReviewTransaction): Promise<{ id: string }[]>

  resolveProficiencyLevelId(
    levelCode: string,
    trx?: ReviewTransaction
  ): Promise<string | null>

  findSkillsByIds(skillIds: string[], trx?: ReviewTransaction): Promise<ReviewSkillInfo[]>
}

export interface ReviewExternalDependencies {
  organization: ReviewOrganizationReader
  user: ReviewUserReaderWriter
  moderatorIdentity: ReviewModeratorIdentityReader
  actorAccess: ReviewActorAccessReader
  userSkill: ReviewUserSkillWriter
  skill: ReviewSkillReader
}
