import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

import User from './user.js'

export default class Notification extends BaseModel {
  static override table = 'notifications'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare user_id: string

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

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>
}
