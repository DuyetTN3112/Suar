import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import ReviewSession from './review_session.js'

import User from '#infra/users/models/user'

/**
 * ReverseReview Model
 *
 * Allows reviewees to rate their reviewers, peers, managers,
 * projects, or organizations (360° feedback).
 */
export default class ReverseReview extends BaseModel {
  static override table = 'reverse_reviews'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare review_session_id: string

  @column()
  declare reviewer_id: string

  @column()
  declare target_type: 'peer' | 'manager' | 'project' | 'organization'

  @column()
  declare target_id: string

  @column()
  declare rating: number // 1-5 stars

  @column()
  declare comment: string | null

  @column()
  declare is_anonymous: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  // Relationships
  @belongsTo(() => ReviewSession, { foreignKey: 'review_session_id' })
  declare review_session: BelongsTo<typeof ReviewSession>

  @belongsTo(() => User, { foreignKey: 'reviewer_id' })
  declare reviewer: BelongsTo<typeof User>
}
