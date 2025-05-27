import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

/**
 * UserDetail Model
 *
 * Extended profile information for users including:
 * - Basic profile (avatar, bio, phone, address)
 * - Freelancer info (rating, completed tasks count)
 * - Preferences (timezone, language)
 */
export default class UserDetail extends BaseModel {
  static override table = 'user_details'

  // Primary Key is user_id (one-to-one relationship)
  @column({ isPrimary: true })
  declare user_id: number

  // ===== Profile Info =====
  @column()
  declare avatar_url: string | null

  @column()
  declare bio: string | null

  @column()
  declare phone: string | null

  @column()
  declare address: string | null

  // ===== Preferences =====
  @column()
  declare timezone: string

  @column()
  declare language: string

  // ===== Freelancer Info =====
  @column()
  declare is_freelancer: boolean

  @column()
  declare freelancer_rating: number | null

  @column()
  declare freelancer_completed_tasks_count: number

  // ===== Timestamps =====
  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  // ===== Relationships =====
  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  // ===== Helpers =====
  get isAvailableForHire(): boolean {
    return this.is_freelancer
  }

  get displayRating(): string {
    if (!this.freelancer_rating) return 'N/A'
    return this.freelancer_rating.toFixed(1)
  }
}
