import { BaseCommand } from '#actions/shared/base_command'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import ReviewMetricsRepository from '#infra/reviews/repositories/review_metrics_repository'
import { DateTime } from 'luxon'
import type { DatabaseId } from '#types/database'
import { calculateTrustScoreV2, determineTier } from '#domain/reviews/review_formulas'

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

  private mapLevelCodeToNumber(levelCode: string): number {
    const map: Record<string, number> = {
      beginner: 1,
      elementary: 2,
      junior: 3,
      middle: 4,
      senior: 5,
      lead: 6,
      principal: 7,
      master: 8,
    }

    return map[levelCode] ?? 1
  }

  async handle(dto: CalculateTrustScoreDTO): Promise<TrustScoreResult> {
    return await this.executeInTransaction(async (trx) => {
      // ── FETCH ──────────────────────────────────────────────────────────
      const sessions = (await ReviewMetricsRepository.listCompletedSessionsForTrust(
        dto.userId,
        trx
      )) as Array<{ id: string; created_at: string | Date }>

      const totalCompletedSessions = sessions.length

      const sessionIds = sessions.map((s) => s.id)

      const reviews = sessionIds.length
        ? ((await ReviewMetricsRepository.listSkillReviewTrustRows(sessionIds, trx)) as Array<{
            review_session_id: string
            reviewer_type: 'manager' | 'peer'
            assigned_level_code: string
            reviewer_credibility_score: number | string
          }>)
        : []

      const totalReviews = reviews.length

      const evidenceCountResult = sessionIds.length
        ? await ReviewMetricsRepository.countSessionsWithEvidence(sessionIds, trx)
        : [{ total: 0 }]
      const sessionsWithEvidence = Number(
        (evidenceCountResult[0] as { total: number | string }).total
      )

      const recentCutoff = DateTime.now().minus({ days: 90 })
      const recentSessions = sessions.filter((s) => {
        const createdAt =
          s.created_at instanceof Date
            ? DateTime.fromJSDate(s.created_at)
            : DateTime.fromISO(s.created_at)
        return createdAt.isValid && createdAt.toMillis() >= recentCutoff.toMillis()
      }).length

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

        const levelNum = this.mapLevelCodeToNumber(review.assigned_level_code)
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

      const evidenceCoverage =
        totalCompletedSessions > 0 ? (sessionsWithEvidence / totalCompletedSessions) * 100 : 0

      const volumeScore = Math.min(100, totalCompletedSessions * 2)
      const recencyScore = Math.min(100, recentSessions * 10)
      const volumeRecency = (volumeScore + recencyScore) / 2

      const orgMemberships = await OrganizationUserRepository.listMembershipsByUser(dto.userId, trx)

      let belongsToPartnerOrg = false
      if (orgMemberships.length > 0) {
        const orgIds = orgMemberships.map((m) => m.organization_id)
        belongsToPartnerOrg = await OrganizationRepository.hasAnyActivePartnerByIds(orgIds, trx)
      }

      const orgPartnerWeight = belongsToPartnerOrg ? 100 : orgMemberships.length > 0 ? 70 : 30

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      const rawScore = calculateTrustScoreV2({
        reviewConsistency,
        reviewerCredibility,
        evidenceCoverage,
        orgPartnerWeight,
        volumeRecency,
      })

      const { tierCode, tierWeight, tierName } = determineTier(
        orgMemberships.length > 0,
        belongsToPartnerOrg
      )

      // v2: org trust signal already contributes in orgPartnerWeight.
      // Keep `calculated_score` equal to raw score to avoid double weighting.
      const calculatedScore = rawScore

      // ── PERSIST ────────────────────────────────────────────────────────
      const user = await UserRepository.findNotDeletedOrFail(dto.userId, trx)
      user.trust_data = {
        ...(user.trust_data ?? {}),
        current_tier_code: tierCode,
        calculated_score: calculatedScore,
        raw_score: rawScore,
        total_verified_reviews: totalReviews,
        last_calculated_at: DateTime.now().toISO(),
        scoring_version: CalculateTrustScoreCommand.TRUST_SCORING_VERSION,
      }
      await UserRepository.save(user, trx)

      await this.logAudit('calculate_trust_score', 'user', dto.userId, null, {
        raw_score: rawScore,
        calculated_score: calculatedScore,
        tier_code: tierCode,
        tier_name: tierName,
        total_reviews: totalReviews,
        v2_signals: {
          review_consistency: Math.round(reviewConsistency * 10) / 10,
          reviewer_credibility: Math.round(reviewerCredibility * 10) / 10,
          evidence_coverage: Math.round(evidenceCoverage * 10) / 10,
          org_partner_weight: orgPartnerWeight,
          volume_recency: Math.round(volumeRecency * 10) / 10,
          tier_weight: tierWeight,
          scoring_version: CalculateTrustScoreCommand.TRUST_SCORING_VERSION,
        },
      })

      return {
        userId: dto.userId,
        rawScore,
        calculatedScore,
        tierCode,
        tierName,
        totalVerifiedReviews: totalReviews,
      }
    })
  }
}
