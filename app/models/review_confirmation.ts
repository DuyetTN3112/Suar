import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ReviewSession from './review_session.js'
import User from './user.js'

/**
 * ReviewConfirmation Model
 *
 * Reviewee can confirm or dispute the review results.
 */
export default class ReviewConfirmation extends BaseModel {
  static override table = 'review_confirmations'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare review_session_id: number

  @column()
  declare user_id: number

  @column()
  declare action: 'confirmed' | 'disputed'

  @column()
  declare dispute_reason: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  // Relationships
  @belongsTo(() => ReviewSession, { foreignKey: 'review_session_id' })
  declare review_session: BelongsTo<typeof ReviewSession>

  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>
}
