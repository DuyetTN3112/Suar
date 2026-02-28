import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import User from '#models/user'
import SkillReview from '#models/skill_review'
import type { DatabaseId } from '#types/database'

/**
 * DTO for updating reviewer credibility
 */
export interface UpdateReviewerCredibilityDTO {
  user_id: DatabaseId
}

/**
 * Command: Update Reviewer Credibility
 *
 * v3: Credibility data stored as JSONB credibility_data on users table
 * instead of separate reviewer_credibility table.
 *
 * Business rules:
 * - Đếm số reviews đã cho
 * - Đếm số reviews được confirmed
 * - Đếm số reviews bị disputed
 * - Tính credibility score: Base 50 + bonus confirmed - penalty disputed
 * - Update credibility_data JSONB on users table
 */
export default class UpdateReviewerCredibilityCommand extends BaseCommand<
  UpdateReviewerCredibilityDTO,
  { credibility_score: number; total_reviews: number }
> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: UpdateReviewerCredibilityDTO): Promise<{
    credibility_score: number
    total_reviews: number
  }> {
    return await this.executeInTransaction(async (trx: TransactionClientContract) => {
      // 1. Count total reviews given → delegate to SkillReview
      const totalReviews = await SkillReview.countCompletedByReviewer(dto.user_id, trx)

      // 2. Count confirmed reviews → delegate to SkillReview
      const confirmed = await SkillReview.countConfirmedByReviewer(dto.user_id, trx)

      // 3. Count disputed reviews → delegate to SkillReview
      const disputed = await SkillReview.countDisputedByReviewer(dto.user_id, trx)

      // 4. Calculate credibility score
      let score = 50.0
      if (totalReviews > 0) {
        score = 50.0 + (confirmed / totalReviews) * 40 - (disputed / totalReviews) * 30
        score = Math.max(0, Math.min(100, score))
      }

      // 5. v3: Update credibility_data JSONB on user record
      const user = await User.query({ client: trx }).where('id', dto.user_id).firstOrFail()
      user.credibility_data = {
        credibility_score: Math.round(score * 100) / 100,
        total_reviews_given: totalReviews,
        accurate_reviews: confirmed,
        disputed_reviews: disputed,
        last_calculated_at: DateTime.now().toISO(),
      }
      await user.useTransaction(trx).save()

      return {
        credibility_score: Math.round(score * 100) / 100,
        total_reviews: totalReviews,
      }
    })
  }
}
