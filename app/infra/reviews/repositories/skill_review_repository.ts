import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { proficiencyLevelOptions } from '#constants'
import SkillReview from '#models/skill_review'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const getExtraNumber = (value: unknown, key: string): number => {
  if (!isRecord(value)) {
    return 0
  }
  const extras = value.$extras
  if (!isRecord(extras)) {
    return 0
  }
  return toNumberValue(extras[key])
}

/**
 * SkillReviewRepository
 *
 * Data access for skill reviews.
 * Extracted from SkillReview model static methods.
 */
export default class SkillReviewRepository {
  // Keep one instance member so this is not a static-only utility class.
  isReady(): true {
    return true
  }

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

    return getExtraNumber(result[0], 'total')
  }

  static async countConfirmedByReviewer(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const dbModule = await import('@adonisjs/lucid/services/db')
    const db = dbModule.default
    const baseDb = trx ?? db

    const result = (await baseDb
      .from('skill_reviews as sr')
      .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
      .where('sr.reviewer_id', userId)
      .where('rs.status', 'completed')
      .whereRaw(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(rs.confirmations) AS c WHERE c->>'action' = 'confirmed')`
      )
      .countDistinct('sr.review_session_id as total')
      .first()) as unknown

    return isRecord(result) ? toNumberValue(result.total) : 0
  }

  static async countDisputedByReviewer(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const dbModule = await import('@adonisjs/lucid/services/db')
    const db = dbModule.default
    const baseDb = trx ?? db

    const result = (await baseDb
      .from('skill_reviews as sr')
      .join('review_sessions as rs', 'rs.id', 'sr.review_session_id')
      .where('sr.reviewer_id', userId)
      .where('rs.status', 'disputed')
      .whereRaw(
        `EXISTS (SELECT 1 FROM jsonb_array_elements(rs.confirmations) AS c WHERE c->>'action' = 'disputed')`
      )
      .countDistinct('sr.review_session_id as total')
      .first()) as unknown

    return isRecord(result) ? toNumberValue(result.total) : 0
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
      const assignedLevelCode = review.assigned_level_code
      const extraAssignedLevelCode = isRecord(review.$extras)
        ? review.$extras.assigned_level_code
        : undefined
      const code =
        typeof assignedLevelCode === 'string'
          ? assignedLevelCode
          : typeof extraAssignedLevelCode === 'string'
            ? extraAssignedLevelCode
            : undefined
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
