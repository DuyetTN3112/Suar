import { BaseCommand } from '#actions/shared/base_command'
import OrganizationUser from '#models/organization_user'
import Organization from '#models/organization'
import User from '#models/user'
import UserSkill from '#models/user_skill'
import { DateTime } from 'luxon'
import type { DatabaseId } from '#types/database'
import {
  calculateRawScore,
  determineTier,
  calculateWeightedTrustScore,
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
  async handle(dto: CalculateTrustScoreDTO): Promise<TrustScoreResult> {
    return await this.executeInTransaction(async (trx) => {
      // ── FETCH ──────────────────────────────────────────────────────────
      const skills = await UserSkill.query({ client: trx })
        .where('user_id', dto.userId)
        .whereNotNull('avg_percentage')

      const skillPercentages = skills.map((s) => s.avg_percentage ?? 0)
      const totalReviews = skills.reduce((sum, s) => sum + s.total_reviews, 0)

      const orgMemberships = await OrganizationUser.query({ client: trx })
        .where('user_id', dto.userId)
        .select('organization_id')

      let belongsToPartnerOrg = false
      if (orgMemberships.length > 0) {
        const orgIds = orgMemberships.map((m) => m.organization_id)
        const partnerOrg = await Organization.query({ client: trx })
          .whereIn('id', orgIds)
          .where('partner_is_active', true)
          .first()
        belongsToPartnerOrg = !!partnerOrg
      }

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      const rawScore = calculateRawScore(skillPercentages)
      const { tierCode, tierWeight, tierName } = determineTier(
        orgMemberships.length > 0,
        belongsToPartnerOrg
      )
      const calculatedScore = calculateWeightedTrustScore(rawScore, tierWeight)

      // ── PERSIST ────────────────────────────────────────────────────────
      const user = await User.query({ client: trx }).where('id', dto.userId).firstOrFail()
      user.trust_data = {
        current_tier_code: tierCode,
        calculated_score: calculatedScore,
        raw_score: rawScore,
        total_verified_reviews: totalReviews,
        last_calculated_at: DateTime.now().toISO(),
      }
      await user.useTransaction(trx).save()

      await this.logAudit('calculate_trust_score', 'user', dto.userId, null, {
        raw_score: rawScore,
        calculated_score: calculatedScore,
        tier_code: tierCode,
        tier_name: tierName,
        total_reviews: totalReviews,
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
