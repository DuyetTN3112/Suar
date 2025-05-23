import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, computed } from '@adonisjs/lucid/orm'
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
  @column()
  declare send_status: 'sending' | 'sent' | 'failed'
  @column()
  declare is_recalled: boolean
  @column.dateTime()
  declare recalled_at: DateTime | null
  @column()
  declare recall_scope: 'self' | 'all' | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
  @column.dateTime()
  declare read_at: DateTime | null

  @belongsTo(() => Conversation, {
    foreignKey: 'conversation_id',
  })
  declare conversation: BelongsTo<typeof Conversation>

  @belongsTo(() => User, {
    foreignKey: 'sender_id',
  })
  declare sender: BelongsTo<typeof User>

  /**
   * Kiểm tra xem tin nhắn có bị thu hồi hiệu quả hay không
   */
  @computed()
  get isEffectivelyRecalled() {
    return this.is_recalled === true && this.recalled_at !== null && this.recall_scope !== null
  }

  /**
   * Kiểm tra xem tin nhắn có được thu hồi cho tất cả mọi người hay không
   */
  @computed()
  get isRecalledForEveryone() {
    return this.is_recalled === true && this.recall_scope === 'all'
  }

  /**
   * Lấy thông tin tóm tắt về tin nhắn
   */
  @computed()
  get summary() {
    return {
      id: this.id,
      message: this.message.length > 30 ? `${this.message.substring(0, 30)}...` : this.message,
      is_recalled: this.is_recalled,
      recall_scope: this.recall_scope,
      sender_id: this.sender_id,
      created_at: this.created_at,
      isEffectivelyRecalled: this.isEffectivelyRecalled,
      isRecalledForEveryone: this.isRecalledForEveryone,
    }
  }
  /**
   * Chuyển đổi model thành JSON để trả về cho client
   */
  toJSON() {
    return {
      id: this.id,
      conversation_id: this.conversation_id,
      sender_id: this.sender_id,
      message: this.message,
      send_status: this.send_status,
      is_recalled: this.is_recalled,
      recalled_at: this.recalled_at,
      recall_scope: this.recall_scope,
      created_at: this.created_at,
      updated_at: this.updated_at,
      read_at: this.read_at,
      isEffectivelyRecalled: this.isEffectivelyRecalled,
      isRecalledForEveryone: this.isRecalledForEveryone,
    }
  }
}
