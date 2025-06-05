import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DatabaseId } from '#types/database'
import User from './user.js'

export default class AuditLog extends BaseModel {
  static override table = 'audit_logs'

  // Turn off timestamps since we only need created_at
  static $timestamps = false

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: DatabaseId | null

  @column()
  declare action: string

  @column()
  declare entity_type: string

  @column()
  // FIX: string thay vì number — compatible với cả INT (legacy) và UUIDv7
  declare entity_id: DatabaseId | null

  @column()
  declare old_values: object | null

  @column()
  declare new_values: object | null

  @column()
  declare ip_address: string | null

  @column()
  declare user_agent: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  // All query methods have been moved to app/repositories/lucid_audit_log_repository.ts.
}
