import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import User from './user.js'
import Conversation from './conversation.js'

export default class ConversationParticipant extends BaseModel {
  static override table = 'conversation_participants'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare conversation_id: string

  @column()
  declare user_id: string

  @belongsTo(() => Conversation, {
    foreignKey: 'conversation_id',
  })
  declare conversation: BelongsTo<typeof Conversation>

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  // ===== Static Methods (Fat Model) =====

  /**
   * Tạo nhiều participants cùng lúc (batch insert)
   * Thay thế: vòng lặp ConversationParticipant.create() trong command
   */
  static async createBatch(
    conversationId: DatabaseId,
    userIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<void> {
    if (userIds.length === 0) return

    const uniqueIds = [...new Set(userIds.map(String))]
    const data = uniqueIds.map((userId) => ({
      conversation_id: String(conversationId),
      user_id: userId,
    }))

    if (trx) {
      await this.createMany(data, { client: trx })
    } else {
      await this.createMany(data)
    }
  }

  /**
   * Kiểm tra user có trong conversation không
   */
  static async isParticipant(
    conversationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const participant = await query
      .where('conversation_id', conversationId)
      .where('user_id', userId)
      .first()
    return !!participant
  }

  /**
   * Đếm số participants trong conversation
   */
  static async countByConversation(
    conversationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const result = await query.where('conversation_id', conversationId).count('* as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

  /**
   * Lấy danh sách user IDs trong conversation
   */
  static async getParticipantIds(
    conversationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const participants = await query.where('conversation_id', conversationId).select('user_id')
    return participants.map((p) => String(p.user_id))
  }

  /**
   * Xóa user khỏi tất cả conversations trong organization
   * Thay thế: trx.from('conversation_participants').where('user_id', userId).whereIn('conversation_id', convIds).delete()
   */
  static async removeByUserInConversations(
    userId: DatabaseId,
    conversationIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<void> {
    if (conversationIds.length === 0) return
    const query = trx ? this.query({ client: trx }) : this.query()
    await query.where('user_id', userId).whereIn('conversation_id', conversationIds).delete()
  }
}
