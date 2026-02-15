import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import TrustTier from './trust_tier.js'

/**
 * Model: UserTrustScore
 * Table: user_trust_scores
 * Mô tả: Trust score của từng user
 */
export default class UserTrustScore extends BaseModel {
  static override table = 'user_trust_scores'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column()
  declare current_tier_id: string

  @column()
  declare calculated_score: number // Điểm đã tính weight

  @column()
  declare raw_score: number // Điểm gốc chưa weight

  @column()
  declare total_verified_reviews: number

  @column.dateTime()
  declare last_calculated_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // Relations
  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => TrustTier, { foreignKey: 'current_tier_id' })
  declare tier: BelongsTo<typeof TrustTier>
}
