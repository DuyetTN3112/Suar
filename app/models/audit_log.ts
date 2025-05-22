import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class AuditLog extends BaseModel {
  static table = 'audit_logs'

  // Turn off timestamps since we only need created_at
  static $timestamps = false

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare user_id: number | null

  @column()
  declare action: string

  @column()
  declare entity_type: string

  @column()
  declare entity_id: number | null

  @column()
  declare old_values: object | null

  @column()
  declare new_values: object | null

  @column()
  declare ip_address: string | null

  @column()
  declare user_agent: string | null

  @column()
  declare metadata: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>
}
