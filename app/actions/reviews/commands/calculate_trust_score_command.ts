import { BaseCommand } from '#actions/shared/base_command'
import OrganizationUser from '#models/organization_user'
import Organization from '#models/organization'
import User from '#models/user'
import UserSkill from '#models/user_skill'
import { TrustTierCode, TRUST_TIER_WEIGHTS } from '#constants/user_constants'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'

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
 * v3: Trust score stored as JSONB trust_data on users table
 * instead of separate user_trust_scores table.
 * Partner status checked via organizations.partner_is_active.
 *
 * Business logic:
 * 1. Tính raw score từ user_skills (avg của avg_percentage)
 * 2. Xác định tier cao nhất dựa trên organizations user thuộc về:
 *    - Partner (weight 1.00) - verified partner org
 *    - Organization (weight 0.80) - org member
 *    - Community (weight 0.50) - default
 * 3. Tính weighted score = raw_score * tier_weight
 * 4. Update trust_data JSONB on users table
 */
export default class CalculateTrustScoreCommand extends BaseCommand<
  CalculateTrustScoreDTO,
  TrustScoreResult
> {
  async handle(dto: CalculateTrustScoreDTO): Promise<TrustScoreResult> {
    return await this.executeInTransaction(async (trx) => {
      // 1. Tính raw score từ user_skills (replaces user_spider_chart_data)
      const { rawScore, totalReviews } = await this.calculateRawScore(dto.userId, trx)

      // 2. Xác định tier cao nhất
      const { tierCode, tierWeight, tierName } = await this.determineUserTier(dto.userId, trx)

      // 3. Tính weighted score
      const calculatedScore = Number((rawScore * tierWeight).toFixed(2))

      // 4. Update trust_data JSONB on user record
      const user = await User.query({ client: trx }).where('id', dto.userId).firstOrFail()
      user.trust_data = {
        current_tier_code: tierCode,
        calculated_score: calculatedScore,
        raw_score: rawScore,
        total_verified_reviews: totalReviews,
        last_calculated_at: DateTime.now().toISO(),
      }
      await user.useTransaction(trx).save()

      // 5. Log audit
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

  /**
   * v3: Tính raw score từ user_skills (avg of avg_percentage)
   */
  private async calculateRawScore(
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<{ rawScore: number; totalReviews: number }> {
    const skills = await UserSkill.query({ client: trx })
      .where('user_id', userId)
      .whereNotNull('avg_percentage')

    if (skills.length === 0) {
      return { rawScore: 0, totalReviews: 0 }
    }

    const totalPercentage = skills.reduce((sum, s) => sum + (s.avg_percentage ?? 0), 0)
    const totalReviews = skills.reduce((sum, s) => sum + s.total_reviews, 0)
    const rawScore = Number((totalPercentage / skills.length).toFixed(2))

    return { rawScore, totalReviews }
  }

  /**
   * v3: Xác định tier cao nhất
   * Checks organizations.partner_is_active instead of verified_partners table
   */
  private async determineUserTier(
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<{ tierCode: string; tierWeight: number; tierName: string }> {
    // Check if user belongs to a verified partner organization
    const orgMemberships = await OrganizationUser.query({ client: trx })
      .where('user_id', userId)
      .select('organization_id')

    if (orgMemberships.length > 0) {
      const orgIds = orgMemberships.map((m) => m.organization_id)
      const partnerOrg = await Organization.query({ client: trx })
        .whereIn('id', orgIds)
        .where('partner_is_active', true)
        .first()

      if (partnerOrg) {
        return {
          tierCode: TrustTierCode.PARTNER,
          tierWeight: TRUST_TIER_WEIGHTS[TrustTierCode.PARTNER],
          tierName: 'Partner-Verified',
        }
      }

      // User belongs to org but not partner
      return {
        tierCode: TrustTierCode.ORGANIZATION,
        tierWeight: TRUST_TIER_WEIGHTS[TrustTierCode.ORGANIZATION],
        tierName: 'Org-Verified',
      }
    }

    // Default: Community tier
    return {
      tierCode: TrustTierCode.COMMUNITY,
      tierWeight: TRUST_TIER_WEIGHTS[TrustTierCode.COMMUNITY],
      tierName: 'Community-Verified',
    }
  }
}
