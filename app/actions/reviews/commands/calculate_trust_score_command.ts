import { BaseCommand } from '#actions/shared/base_command'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import ReviewMetricsRepository from '#infra/reviews/repositories/review_metrics_repository'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import type { DatabaseId } from '#types/database'
import {
  calculateTrustScoreV2,
  determineTier,
  mapLevelCodeToNumber,
} from '#domain/reviews/review_formulas'

/**
 * DTO for CalculateTrustScore
 */
export interface CalculateTrustScoreDTO {
  userId: DatabaseId
}

/**
 * Result of trust score calculation
 */
export interface TrustScoreResult {
  userId: DatabaseId
  rawScore: number
  calculatedScore: number
  tierCode: string
  tierName: string
  totalVerifiedReviews: number
}

/**
 * Command: Calculate Trust Score for a User
 *
 * v3: Trust score stored as JSONB trust_data on users table.
 *
 * Pattern: FETCH → DECIDE (pure formulas) → PERSIST
 */
export default class CalculateTrustScoreCommand extends BaseCommand<
  CalculateTrustScoreDTO,
  TrustScoreResult
> {
  private static readonly TRUST_SCORING_VERSION = 'trust_v2'

  async handle(dto: CalculateTrustScoreDTO): Promise<TrustScoreResult> {
    return await this.executeInTransaction(async (trx) => {
      const fetched = await this.fetchTrustScoreData(dto.userId, trx)
      const computed = this.computeTrustScore(fetched)

      await this.persistTrustScore(dto.userId, computed, trx)
      await this.logTrustScoreAudit(dto.userId, computed)

      return {
        userId: dto.userId,
        rawScore: computed.rawScore,
        calculatedScore: computed.calculatedScore,
        tierCode: computed.tierCode,
        tierName: computed.tierName,
        totalVerifiedReviews: computed.totalVerifiedReviews,
      }
    })
  }

  private async fetchTrustScoreData(
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<TrustScoreFetchResult> {
    const sessions = (await ReviewMetricsRepository.listCompletedSessionsForTrust(
      userId,
      trx
    )) as TrustScoreSessionRow[]

    const sessionIds = sessions.map((session) => session.id)

    const reviews = sessionIds.length
      ? ((await ReviewMetricsRepository.listSkillReviewTrustRows(
          sessionIds,
          trx
        )) as TrustScoreReviewRow[])
      : []

    const evidenceCountResult = sessionIds.length
      ? await ReviewMetricsRepository.countSessionsWithEvidence(sessionIds, trx)
      : [{ total: 0 }]

    const sessionsWithEvidence = Number(
      (evidenceCountResult[0] as TrustScoreEvidenceCountRow).total
    )

    const orgMemberships = (await OrganizationUserRepository.listMembershipsByUser(
      userId,
      trx
    )) as TrustScoreOrgMembershipRow[]

    let belongsToPartnerOrg = false
    if (orgMemberships.length > 0) {
      const orgIds = orgMemberships.map((membership) => membership.organization_id)
      belongsToPartnerOrg = await OrganizationRepository.hasAnyActivePartnerByIds(orgIds, trx)
    }

    return {
      sessions,
      reviews,
      sessionsWithEvidence,
      orgMemberships,
      belongsToPartnerOrg,
    }
  }

  private computeTrustScore(fetched: TrustScoreFetchResult): TrustScoreComputationResult {
    const totalCompletedSessions = fetched.sessions.length
    const totalReviews = fetched.reviews.length
    const recentSessions = this.countRecentSessions(fetched.sessions)
    const { reviewConsistency, reviewerCredibility } = this.calculateReviewSignals(fetched.reviews)

    const evidenceCoverage =
      totalCompletedSessions > 0 ? (fetched.sessionsWithEvidence / totalCompletedSessions) * 100 : 0
    const volumeScore = Math.min(100, totalCompletedSessions * 2)
    const recencyScore = Math.min(100, recentSessions * 10)
    const volumeRecency = (volumeScore + recencyScore) / 2
    const orgPartnerWeight = fetched.belongsToPartnerOrg
      ? 100
      : fetched.orgMemberships.length > 0
        ? 70
        : 30

    const rawScore = calculateTrustScoreV2({
      reviewConsistency,
      reviewerCredibility,
      evidenceCoverage,
      orgPartnerWeight,
      volumeRecency,
    })

    const { tierCode, tierWeight, tierName } = determineTier(
      fetched.orgMemberships.length > 0,
      fetched.belongsToPartnerOrg
    )

    // v2: org trust signal already contributes in orgPartnerWeight.
    // Keep `calculated_score` equal to raw score to avoid double weighting.
    const calculatedScore = rawScore

    return {
      rawScore,
      calculatedScore,
      tierCode,
      tierName,
      tierWeight,
      totalVerifiedReviews: totalReviews,
      scoringVersion: CalculateTrustScoreCommand.TRUST_SCORING_VERSION,
      signals: {
        reviewConsistency,
        reviewerCredibility,
        evidenceCoverage,
        orgPartnerWeight,
        volumeRecency,
      },
    }
  }

  private countRecentSessions(sessions: TrustScoreSessionRow[]): number {
    const recentCutoff = DateTime.now().minus({ days: 90 })

    return sessions.filter((session) => {
      const createdAt =
        session.created_at instanceof Date
          ? DateTime.fromJSDate(session.created_at)
          : DateTime.fromISO(session.created_at)

      return createdAt.isValid && createdAt.toMillis() >= recentCutoff.toMillis()
    }).length
  }

  private calculateReviewSignals(reviews: TrustScoreReviewRow[]): {
    reviewConsistency: number
    reviewerCredibility: number
  } {
    const reviewConsistencyBySession = new Map<
      string,
      { managerLevels: number[]; peerLevels: number[] }
    >()
    let reviewerCredibilityTotal = 0
    let reviewerCredibilityCount = 0

    for (const review of reviews) {
      const bucket = reviewConsistencyBySession.get(review.review_session_id) ?? {
        managerLevels: [],
        peerLevels: [],
      }

      const levelNum = mapLevelCodeToNumber(review.assigned_level_code)
      if (review.reviewer_type === 'manager') {
        bucket.managerLevels.push(levelNum)
      } else {
        bucket.peerLevels.push(levelNum)
      }
      reviewConsistencyBySession.set(review.review_session_id, bucket)

      reviewerCredibilityTotal += Number(review.reviewer_credibility_score)
      reviewerCredibilityCount += 1
    }

    const consistencyScores: number[] = []
    for (const bucket of reviewConsistencyBySession.values()) {
      if (bucket.managerLevels.length === 0 || bucket.peerLevels.length === 0) {
        continue
      }

      const managerAvg =
        bucket.managerLevels.reduce((sum, value) => sum + value, 0) / bucket.managerLevels.length
      const peerAvg =
        bucket.peerLevels.reduce((sum, value) => sum + value, 0) / bucket.peerLevels.length
      const delta = Math.abs(managerAvg - peerAvg)
      consistencyScores.push(Math.max(0, 100 - delta * 15))
    }

    const reviewConsistency =
      consistencyScores.length > 0
        ? consistencyScores.reduce((sum, value) => sum + value, 0) / consistencyScores.length
        : 50

    const reviewerCredibility =
      reviewerCredibilityCount > 0 ? reviewerCredibilityTotal / reviewerCredibilityCount : 50

    return { reviewConsistency, reviewerCredibility }
  }

  private async persistTrustScore(
    userId: DatabaseId,
    computed: TrustScoreComputationResult,
    trx: TransactionClientContract
  ): Promise<void> {
    const user = await UserRepository.findNotDeletedOrFail(userId, trx)
    user.trust_data = {
      ...(user.trust_data ?? {}),
      current_tier_code: computed.tierCode,
      calculated_score: computed.calculatedScore,
      raw_score: computed.rawScore,
      total_verified_reviews: computed.totalVerifiedReviews,
      last_calculated_at: DateTime.now().toISO(),
      scoring_version: computed.scoringVersion,
    }
    await UserRepository.save(user, trx)
  }

  private async logTrustScoreAudit(
    userId: DatabaseId,
    computed: TrustScoreComputationResult
  ): Promise<void> {
    await this.logAudit('calculate_trust_score', 'user', userId, null, {
      raw_score: computed.rawScore,
      calculated_score: computed.calculatedScore,
      tier_code: computed.tierCode,
      tier_name: computed.tierName,
      total_reviews: computed.totalVerifiedReviews,
      v2_signals: {
        review_consistency: Math.round(computed.signals.reviewConsistency * 10) / 10,
        reviewer_credibility: Math.round(computed.signals.reviewerCredibility * 10) / 10,
        evidence_coverage: Math.round(computed.signals.evidenceCoverage * 10) / 10,
        org_partner_weight: computed.signals.orgPartnerWeight,
        volume_recency: Math.round(computed.signals.volumeRecency * 10) / 10,
        tier_weight: computed.tierWeight,
        scoring_version: computed.scoringVersion,
      },
    })
  }
}

interface TrustScoreSessionRow {
  id: string
  created_at: string | Date
}

interface TrustScoreReviewRow {
  review_session_id: string
  reviewer_type: 'manager' | 'peer'
  assigned_level_code: string
  reviewer_credibility_score: number | string
}

interface TrustScoreEvidenceCountRow {
  total: number | string
}

interface TrustScoreOrgMembershipRow {
  organization_id: string
}

interface TrustScoreFetchResult {
  sessions: TrustScoreSessionRow[]
  reviews: TrustScoreReviewRow[]
  sessionsWithEvidence: number
  orgMemberships: TrustScoreOrgMembershipRow[]
  belongsToPartnerOrg: boolean
}

interface TrustScoreComputationResult {
  rawScore: number
  calculatedScore: number
  tierCode: string
  tierName: string
  tierWeight: number
  totalVerifiedReviews: number
  scoringVersion: string
  signals: {
    reviewConsistency: number
    reviewerCredibility: number
    evidenceCoverage: number
    orgPartnerWeight: number
    volumeRecency: number
  }
}
