import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

/**
 * ReviewerCredibility Model
 *
 * Tracks each reviewer's credibility score based on:
 * - Accuracy of their reviews (confirmed vs disputed)
 * - Total reviews given
 */
export default class ReviewerCredibility extends BaseModel {
  static override table = 'reviewer_credibility'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare user_id: number

  @column()
  declare credibility_score: number // 0-100, starts at 50

  @column()
  declare total_reviews_given: number

  @column()
  declare accurate_reviews: number

  @column()
  declare disputed_reviews: number

  @column.dateTime()
  declare last_calculated_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relationships
  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>

  /**
   * Calculate credibility percentage based on accurate vs disputed reviews
   */
  get accuracy_percentage(): number {
    if (this.total_reviews_given === 0) return 50
    return (this.accurate_reviews / this.total_reviews_given) * 100
  }
}
