import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Conversation from './conversation.js'

export default class Message extends BaseModel {
  static table = 'messages'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare conversation_id: number

  @column()
  declare sender_id: number

  @column()
  declare message: string

  @column.dateTime()
  declare read_at: DateTime | null

  @column.dateTime()
  declare timestamp: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @belongsTo(() => Conversation, {
    foreignKey: 'conversation_id',
  })
  declare conversation: BelongsTo<typeof Conversation>

  @belongsTo(() => User, {
    foreignKey: 'sender_id',
  })
  declare sender: BelongsTo<typeof User>
}
