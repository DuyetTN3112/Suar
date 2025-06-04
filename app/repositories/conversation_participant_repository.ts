import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import ConversationParticipant from '#models/conversation_participant'

/**
 * ConversationParticipantRepository
 *
 * Data access for conversation participants.
 * Extracted from ConversationParticipant model static methods.
 */
export default class ConversationParticipantRepository {
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
      await ConversationParticipant.createMany(data, { client: trx })
    } else {
      await ConversationParticipant.createMany(data)
    }
  }

  static async isParticipant(
    conversationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const query = trx
      ? ConversationParticipant.query({ client: trx })
      : ConversationParticipant.query()
    const participant = await query
      .where('conversation_id', conversationId)
      .where('user_id', userId)
      .first()
    return !!participant
  }

  static async countByConversation(
    conversationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const query = trx
      ? ConversationParticipant.query({ client: trx })
      : ConversationParticipant.query()
    const result = await query.where('conversation_id', conversationId).count('* as total')
    return Number((result[0] as any)?.$extras?.total ?? 0)
  }

  static async getParticipantIds(
    conversationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    const query = trx
      ? ConversationParticipant.query({ client: trx })
      : ConversationParticipant.query()
    const participants = await query.where('conversation_id', conversationId).select('user_id')
    return participants.map((p) => String(p.user_id))
  }

  static async removeByUserInConversations(
    userId: DatabaseId,
    conversationIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<void> {
    if (conversationIds.length === 0) return
    const query = trx
      ? ConversationParticipant.query({ client: trx })
      : ConversationParticipant.query()
    await query.where('user_id', userId).whereIn('conversation_id', conversationIds).delete()
  }
}
