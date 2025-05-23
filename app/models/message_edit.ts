import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Message from './message.js'

export default class MessageEdit extends BaseModel {
  static table = 'message_edits'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare message_id: number

  @column()
  declare old_content: string

  @column()
  declare edited_by: number

  @column.dateTime({ autoCreate: true })
  declare edited_at: DateTime

  @belongsTo(() => Message, {
    foreignKey: 'message_id',
  })
  declare message: BelongsTo<typeof Message>

  @belongsTo(() => User, {
    foreignKey: 'edited_by',
  })
  declare editor: BelongsTo<typeof User>
}
