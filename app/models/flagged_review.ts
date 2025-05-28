import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SkillReview from './skill_review.js'

/**
 * FlaggedReview Model
 *
 * Reviews flagged for potential manipulation or anomalies.
 */
export default class FlaggedReview extends BaseModel {
  static override table = 'flagged_reviews'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare skill_review_id: number

  @column()
  declare flag_id: number

  @column()
  declare detected_at: DateTime

  @column()
  declare reviewed_by: number | null

  @column.dateTime()
  declare reviewed_at: DateTime | null

  @column()
  declare resolution: 'pending' | 'confirmed_valid' | 'confirmed_anomaly' | 'dismissed' | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  // Relationships
  @belongsTo(() => SkillReview, { foreignKey: 'skill_review_id' })
  declare skill_review: BelongsTo<typeof SkillReview>
}
