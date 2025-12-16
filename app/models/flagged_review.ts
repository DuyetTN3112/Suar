import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import SkillReview from './skill_review.js'
import AnomalyFlag from './anomaly_flag.js'
import User from './user.js'

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
  declare anomaly_flag_id: number

  @column.dateTime({ autoCreate: true })
  declare detected_at: DateTime

  @column()
  declare status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'

  @column()
  declare reviewed_by: number | null

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

  @belongsTo(() => AnomalyFlag, { foreignKey: 'anomaly_flag_id' })
  declare anomaly_flag: BelongsTo<typeof AnomalyFlag>

  @belongsTo(() => User, { foreignKey: 'reviewed_by' })
  declare reviewer: BelongsTo<typeof User>
}

