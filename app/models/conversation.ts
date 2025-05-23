import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Message from './message.js'
import ConversationParticipant from './conversation_participant.js'
import Organization from './organization.js'

export default class Conversation extends BaseModel {
  static table = 'conversations'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare title: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column()
  declare last_message_id: number | null

  @column()
  declare organization_id: number | null

  @hasMany(() => Message)
  declare messages: HasMany<typeof Message>

  @manyToMany(() => User, {
    pivotTable: 'conversation_participants',
  })
  declare participants: ManyToMany<typeof User>

  @hasMany(() => ConversationParticipant, {
    foreignKey: 'conversation_id',
  })
  declare conversation_participants: HasMany<typeof ConversationParticipant>

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>
}
