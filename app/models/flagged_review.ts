import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SkillReview from './skill_review.js'
import User from './user.js'

/**
 * FlaggedReview Model (v3)
 *
 * Reviews flagged for potential manipulation or anomalies.
 * flag_type + severity: inline strings replace anomaly_flag_id FK.
 */
export default class FlaggedReview extends BaseModel {
  static override table = 'flagged_reviews'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare skill_review_id: string

  // v3: inline flag_type replaces anomaly_flag_id FK
  @column()
  declare flag_type: string

  // v3: inline severity replaces anomaly_flag_id FK
  @column()
  declare severity: string

  @column.dateTime({ autoCreate: true })
  declare detected_at: DateTime

  @column()
  declare status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'

  @column()
  declare reviewed_by: string | null

  @column.dateTime()
  declare reviewed_at: DateTime | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relationships
  @belongsTo(() => SkillReview, { foreignKey: 'skill_review_id' })
  declare skill_review: BelongsTo<typeof SkillReview>

  @belongsTo(() => User, { foreignKey: 'reviewed_by' })
  declare reviewer: BelongsTo<typeof User>
}
