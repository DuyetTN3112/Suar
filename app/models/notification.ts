import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class Notification extends BaseModel {
  static table = 'notifications'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare user_id: number

  @column()
  declare title: string

  @column()
  declare message: string

  @column()
  declare is_read: boolean

  @column()
  declare type: string

  @column()
  declare related_entity_type: string | null

  @column()
  declare related_entity_id: string | null

  @column()
  declare metadata: string | null

  @column.dateTime()
  declare read_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>
}
