import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class UserDetail extends BaseModel {
  static table = 'user_details'
  static primaryKey = 'user_id'
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare user_id: number

  @column()
  declare phone_number: string | null

  @column()
  declare bio: string | null

  @column()
  declare avatar_url: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>
}
