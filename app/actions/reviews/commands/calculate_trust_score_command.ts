import { BaseCommand } from '#actions/shared/base_command'
import db from '@adonisjs/lucid/services/db'
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
  tierId: DatabaseId
  tierName: string
  totalVerifiedReviews: number
}

/**
 * Command: Calculate Trust Score for a User
 *
 * Di chuyển từ database procedure: calculate_user_trust_score(p_user_id)
 *
 * Business logic:
 * 1. Tính raw score từ user_spider_chart_data (avg của tất cả skills)
 * 2. Xác định tier cao nhất dựa trên organizations user thuộc về:
 *    - Partner (tier 3, weight 1.00) - verified partner
 *    - Organization (tier 2, weight 0.80) - org member
 *    - Community (tier 1, weight 0.50) - default
 * 3. Tính weighted score = raw_score * tier_weight
 * 4. Upsert vào user_trust_scores
 *
 * @example
 * const command = new CalculateTrustScoreCommand(ctx)
 * const result = await command.handle({ userId: 123 })
 */
export default class CalculateTrustScoreCommand extends BaseCommand<
  CalculateTrustScoreDTO,
  TrustScoreResult
> {
  async handle(dto: CalculateTrustScoreDTO): Promise<TrustScoreResult> {
    return await this.executeInTransaction(async (trx) => {
      // 1. Tính raw score từ spider chart data
      const { rawScore, totalReviews } = await this.calculateRawScore(dto.userId, trx)

      // 2. Xác định tier cao nhất
      const { tierId, tierWeight, tierName } = await this.determineUserTier(dto.userId, trx)

      // 3. Tính weighted score
      const calculatedScore = Number((rawScore * tierWeight).toFixed(2))

      // 4. Upsert vào user_trust_scores
      await this.upsertTrustScore(dto.userId, tierId, calculatedScore, rawScore, totalReviews, trx)

      // 5. Log audit
      await this.logAudit('calculate_trust_score', 'user_trust_scores', dto.userId, null, {
        raw_score: rawScore,
        calculated_score: calculatedScore,
        tier_id: tierId,
        tier_name: tierName,
        total_reviews: totalReviews,
      })

      return {
        userId: dto.userId,
        rawScore,
        calculatedScore,
        tierId,
        tierName,
        totalVerifiedReviews: totalReviews,
      }
    })
  }

  /**
   * Tính raw score từ user_spider_chart_data
   * Raw score = average của tất cả avg_percentage
   */
  private async calculateRawScore(
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<{ rawScore: number; totalReviews: number }> {
    const result = (await trx
      .from('user_spider_chart_data')
      .where('user_id', userId)
      .select(
        db.raw('COALESCE(AVG(avg_percentage), 0) as raw_score'),
        db.raw('COUNT(*) as total_reviews')
      )
      .first()) as { raw_score?: unknown; total_reviews?: unknown } | null

    const row = result
    return {
      rawScore: Number(row?.raw_score || 0),
      totalReviews: Number(row?.total_reviews || 0),
    }
  }

  /**
   * Xác định tier cao nhất của user dựa trên organizations
   *
   * Logic từ database:
   * - Nếu user thuộc verified_partner → tier 3 (Partner, weight 1.00)
   * - Nếu user thuộc organization → tier 2 (Organization, weight 0.80)
   * - Default → tier 1 (Community, weight 0.50)
   */
  private async determineUserTier(
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<{ tierId: DatabaseId; tierWeight: number; tierName: string }> {
    // Check nếu user thuộc verified partner
    const partnerCheck = (await trx
      .from('organization_users')
      .join('organizations', 'organization_users.organization_id', 'organizations.id')
      .join('verified_partners', (join) => {
        join
          .on('verified_partners.organization_id', 'organizations.id')
          .andOnVal('verified_partners.is_active', true)
      })
      .where('organization_users.user_id', userId)
      .where('organization_users.status', 'approved')
      .select('verified_partners.id')
      .first()) as { id: DatabaseId } | null

    if (partnerCheck) {
      // Tier 3: Partner-Verified
      return {
        tierId: 3,
        tierWeight: 1.0,
        tierName: 'Partner-Verified',
      }
    }

    // Check nếu user thuộc organization
    const orgCheck = (await trx
      .from('organization_users')
      .where('user_id', userId)
      .where('status', 'approved')
      .first()) as { id: DatabaseId } | null

    if (orgCheck) {
      // Tier 2: Org-Verified
      return {
        tierId: 2,
        tierWeight: 0.8,
        tierName: 'Org-Verified',
      }
    }

    // Default: Tier 1: Community-Verified
    return {
      tierId: 1,
      tierWeight: 0.5,
      tierName: 'Community-Verified',
    }
  }

  /**
   * Upsert vào user_trust_scores
   */
  private async upsertTrustScore(
    userId: DatabaseId,
    tierId: DatabaseId,
    calculatedScore: number,
    rawScore: number,
    totalReviews: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const now = new Date()

    // Check if exists
    const existing = (await trx.from('user_trust_scores').where('user_id', userId).first()) as {
      id: DatabaseId
    } | null

    if (existing) {
      // Update
      await trx.from('user_trust_scores').where('user_id', userId).update({
        current_tier_id: tierId,
        calculated_score: calculatedScore,
        raw_score: rawScore,
        total_verified_reviews: totalReviews,
        last_calculated_at: now,
        updated_at: now,
      })
    } else {
      // Insert
      await trx.table('user_trust_scores').insert({
        user_id: userId,
        current_tier_id: tierId,
        calculated_score: calculatedScore,
        raw_score: rawScore,
        total_verified_reviews: totalReviews,
        last_calculated_at: now,
        created_at: now,
        updated_at: now,
      })
    }
  }
}
