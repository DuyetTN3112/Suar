import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Message from './message.js'

export default class DeletedMessage extends BaseModel {
  static table = 'deleted_messages'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare message_id: number

  @column()
  declare user_id: number

  @column.dateTime({ autoCreate: true })
  declare deleted_at: DateTime

  @belongsTo(() => Message, {
    foreignKey: 'message_id',
  })
  declare message: BelongsTo<typeof Message>

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>
}