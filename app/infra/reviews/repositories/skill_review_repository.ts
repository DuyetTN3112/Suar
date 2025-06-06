import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { proficiencyLevelOptions } from '#constants'
import SkillReview from '#models/skill_review'

/**
 * SkillReviewRepository
 *
 * Data access for skill reviews.
 * Extracted from SkillReview model static methods.
 */
export default class SkillReviewRepository {
  static async countCompletedByReviewer(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? SkillReview.query({ client: trx }) : SkillReview.query()
    const result = await query
      .join('review_sessions', 'review_sessions.id', 'skill_reviews.review_session_id')
      .where('skill_reviews.reviewer_id', userId)
      .where('review_sessions.status', 'completed')
      .count('* as total')

    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

  static async countConfirmedByReviewer(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const db = (await import('@adonisjs/lucid/services/db')).default
    const baseDb = trx ?? db

    const result = await baseDb
      .from('skill_reviews as sr')
      .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
      .where('sr.reviewer_id', userId)
      .where('rs.status', 'completed')
      .whereRaw(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(rs.confirmations) AS c WHERE c->>'action' = 'confirmed')`
      )
      .countDistinct('sr.review_session_id as total')
      .first()

    return Number(result?.total ?? 0)
  }

  static async countDisputedByReviewer(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const db = (await import('@adonisjs/lucid/services/db')).default
    const baseDb = trx ?? db

    const result = await baseDb
      .from('skill_reviews as sr')
      .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
      .where('sr.reviewer_id', userId)
      .where('rs.status', 'disputed')
      .whereRaw(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(rs.confirmations) AS c WHERE c->>'action' = 'disputed')`
      )
      .countDistinct('sr.review_session_id as total')
      .first()

    return Number(result?.total ?? 0)
  }

  /**
   * Calculate average proficiency percentage from skill reviews.
   * Maps assigned_level_code to proficiency midpoint percentages.
   */
  static async calculateSkillAvgPercentage(
    userId: DatabaseId,
    skillId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<{ avgPercentage: number; totalReviews: number }> {
    const query = trx ? SkillReview.query({ client: trx }) : SkillReview.query()
    const reviews = await query
      .join('review_sessions', 'review_sessions.id', 'skill_reviews.review_session_id')
      .where('review_sessions.reviewee_id', userId)
      .where('skill_reviews.skill_id', skillId)
      .where('review_sessions.status', 'completed')
      .select('skill_reviews.assigned_level_code')

    if (reviews.length === 0) {
      return { avgPercentage: 0, totalReviews: 0 }
    }

    let sum = 0
    for (const review of reviews) {
      const code =
        (review as any).assigned_level_code || (review as any).$extras?.assigned_level_code
      const opt = proficiencyLevelOptions.find((o) => o.value === code)
      if (opt) {
        sum += (opt.minPercentage + opt.maxPercentage) / 2
      }
    }

    return {
      avgPercentage: sum / reviews.length,
      totalReviews: reviews.length,
    }
  }
}
