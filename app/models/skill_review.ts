import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { proficiencyLevelOptions } from '#constants'
import ReviewSession from './review_session.js'
import User from './user.js'
import Skill from './skill.js'

/**
 * SkillReview Model (v3)
 *
 * Individual skill rating within a review session.
 * assigned_level_code: inline proficiency level string (replaces assigned_level_id FK)
 */
export default class SkillReview extends BaseModel {
  static override table = 'skill_reviews'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare review_session_id: string

  @column()
  declare reviewer_id: string

  @column()
  declare reviewer_type: 'manager' | 'peer'

  @column()
  declare skill_id: string

  // v3: inline level code replaces assigned_level_id FK
  @column()
  declare assigned_level_code: string

  @column()
  declare comment: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relationships
  @belongsTo(() => ReviewSession, { foreignKey: 'review_session_id' })
  declare review_session: BelongsTo<typeof ReviewSession>

  @belongsTo(() => User, { foreignKey: 'reviewer_id' })
  declare reviewer: BelongsTo<typeof User>

  @belongsTo(() => Skill, { foreignKey: 'skill_id' })
  declare skill: BelongsTo<typeof Skill>

  // ===== Fat Model Static Methods =====

  /**
   * Đếm tổng reviews completed mà user đã cho (as reviewer)
   */
  static async countCompletedByReviewer(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const result = await query
      .join('review_sessions', 'review_sessions.id', 'skill_reviews.review_session_id')
      .where('skill_reviews.reviewer_id', userId)
      .where('review_sessions.status', 'completed')
      .count('* as total')

    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

  /**
   * Đếm confirmed reviews mà user đã cho
   * v3: review_confirmations table removed, confirmations is JSONB on review_sessions
   * Query now checks the JSONB array on review_sessions instead of joining review_confirmations
   */
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

  /**
   * Đếm disputed reviews mà user đã cho
   * v3: uses JSONB confirmations on review_sessions
   */
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
   * Tính average percentage cho một skill dựa trên completed reviews
   * v3: no more JOIN to proficiency_levels table — uses assigned_level_code + PROFICIENCY_LEVEL_RANGES
   * Computes midpoint of each level's range in app code
   */
  static async calculateSkillAvgPercentage(
    userId: DatabaseId,
    skillId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<{ avgPercentage: number; totalReviews: number }> {
    const query = trx ? this.query({ client: trx }) : this.query()
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
