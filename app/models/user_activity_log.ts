import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

/**
 * Model: UserActivityLog
 * Table: user_activity_logs
 * Mô tả: Log hoạt động của user để detect anomaly
 */
export default class UserActivityLog extends BaseModel {
  static override table = 'user_activity_logs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

  @column()
  declare action_type: string // review_given, review_received, login, etc.

  @column({
    prepare: (value: object | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | null) => (value ? (JSON.parse(value) as object) : null),
  })
  declare action_data: object | null

  @column()
  declare related_entity_type: string | null // task, review_session, etc.

  @column()
  declare related_entity_id: string | null

  @column()
  declare ip_address: string | null

  @column()
  declare user_agent: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  // Relations
  @belongsTo(() => User, { foreignKey: 'user_id' })
  declare user: BelongsTo<typeof User>
}
