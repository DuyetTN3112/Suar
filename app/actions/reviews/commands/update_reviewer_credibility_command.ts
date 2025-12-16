import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import db from '@adonisjs/lucid/services/db'

/**
 * DTO for updating reviewer credibility
 */
export interface UpdateReviewerCredibilityDTO {
  user_id: number
}

/**
 * Command: Update Reviewer Credibility
 *
 * Migrate từ stored procedure: update_reviewer_credibility
 *
 * Business rules:
 * - Đếm số reviews đã cho
 * - Đếm số reviews được confirmed
 * - Đếm số reviews bị disputed
 * - Tính credibility score: Base 50 + bonus confirmed - penalty disputed
 * - Upsert vào reviewer_credibility table
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
    return await this.executeInTransaction(async (trx) => {
      // 1. Count total reviews given
      const totalReviewsResult = await db
        .from('skill_reviews')
        .join('review_sessions', 'skill_reviews.review_session_id', 'review_sessions.id')
        .where('skill_reviews.reviewer_id', dto.user_id)
        .where('review_sessions.status', 'completed')
        .count('* as count')
        .useTransaction(trx as any)
        .first()

      const totalReviews = Number(totalReviewsResult?.count || 0)

      // 2. Count confirmed reviews
      const confirmedResult = await db
        .from('skill_reviews')
        .join('review_sessions', 'skill_reviews.review_session_id', 'review_sessions.id')
        .join(
          'review_confirmations',
          'review_confirmations.review_session_id',
          'review_sessions.id'
        )
        .where('skill_reviews.reviewer_id', dto.user_id)
        .where('review_sessions.status', 'completed')
        .where('review_confirmations.action', 'confirmed')
        .countDistinct('skill_reviews.review_session_id as count')
        .useTransaction(trx as any)
        .first()

      const confirmed = Number(confirmedResult?.count || 0)

      // 3. Count disputed reviews
      const disputedResult = await db
        .from('skill_reviews')
        .join('review_sessions', 'skill_reviews.review_session_id', 'review_sessions.id')
        .join(
          'review_confirmations',
          'review_confirmations.review_session_id',
          'review_sessions.id'
        )
        .where('skill_reviews.reviewer_id', dto.user_id)
        .where('review_sessions.status', 'disputed')
        .where('review_confirmations.action', 'disputed')
        .countDistinct('skill_reviews.review_session_id as count')
        .useTransaction(trx as any)
        .first()

      const disputed = Number(disputedResult?.count || 0)

      // 4. Calculate credibility score
      // Base 50 + bonus từ confirmed - penalty từ disputed
      let score = 50.0
      if (totalReviews > 0) {
        score = 50.0 + (confirmed / totalReviews) * 40 - (disputed / totalReviews) * 30
        score = Math.max(0, Math.min(100, score)) // Limit 0-100
      }

      // 5. Upsert reviewer_credibility
      const existing = await db
        .from('reviewer_credibility')
        .where('user_id', dto.user_id)
        .useTransaction(trx as any)
        .first()

      if (existing) {
        await db
          .from('reviewer_credibility')
          .where('user_id', dto.user_id)
          .update({
            credibility_score: score,
            total_reviews_given: totalReviews,
            accurate_reviews: confirmed,
            disputed_reviews: disputed,
            last_calculated_at: new Date(),
          })
          .useTransaction(trx as any)
      } else {
        await db
          .table('reviewer_credibility')
          .insert({
            user_id: dto.user_id,
            credibility_score: score,
            total_reviews_given: totalReviews,
            accurate_reviews: confirmed,
            disputed_reviews: disputed,
            last_calculated_at: new Date(),
          })
          .useTransaction(trx as any)
      }

      return {
        credibility_score: Math.round(score * 100) / 100,
        total_reviews: totalReviews,
      }
    })
  }
}
