import type { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import redis from '@adonisjs/redis/services/main'
import { GetConversationDetailDTO } from '../dtos/get_conversation_detail_dto.js'
import { Exception } from '@adonisjs/core/exceptions'
import Database from '@adonisjs/lucid/services/db'

export class NotFoundError extends Exception {
  static status = 404
  static code = 'E_CONVERSATION_NOT_FOUND'
  static message = 'Conversation not found or you do not have access'
}

/**
 * Query: Lấy chi tiết conversation bao gồm:
 * - Conversation info
 * - Participants (users)
 * - Unread messages count
 * - Last message
 *
 * Features:
 * - Redis caching (5 min)
 * - Verify user is participant
 * - Preload relationships
 */
export default class GetConversationDetailQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(dto: GetConversationDetailDTO): Promise<Conversation> {
    const user = this.ctx.auth.user!
    const { conversationId } = dto

    try {
      // Try cache first
      const cacheKey = `conversation:${conversationId}:detail:user:${user.id}`
      const cached = await redis.get(cacheKey)

      if (cached) {
        return JSON.parse(cached)
      }

      // Query conversation
      const conversation = await Conversation.query()
        .where('id', conversationId)
        .whereNull('deleted_at')
        .whereHas('participants', (participantQuery) => {
          participantQuery.where('user_id', user.id)
        })
        .preload('participants')
        .first()

      if (!conversation) {
        throw new NotFoundError()
      }

      // Count unread messages (messages where sender != current user AND read_at is null)
      const unreadCount = await this.getUnreadCount(conversationId, user.id)

      // Get last message
      const lastMessage = await this.getLastMessage(conversationId, user.id)

      // Attach to conversation object for easy access
      // @ts-ignore - Adding virtual properties
      conversation.unreadCount = unreadCount
      // @ts-ignore
      conversation.lastMessage = lastMessage

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(conversation))

      return conversation
    } catch (error) {
      console.error('[GetConversationDetailQuery] Error:', error)
      throw error
    }
  }

  /**
   * Get unread message count for a user in conversation
   * Exclude messages recalled by sender for self (recall_scope = 'self' AND sender_id = userId)
   */
  private async getUnreadCount(conversationId: number, userId: number): Promise<number> {
    const result = await Database.from('messages')
      .where('messages.conversation_id', conversationId)
      .where('messages.sender_id', '!=', userId)
      .whereNull('messages.read_at')
      .whereRaw(
        `(messages.is_recalled = false OR (messages.is_recalled = true AND NOT (messages.recall_scope = 'self' AND messages.sender_id = ?)))`,
        [userId]
      )
      .count('messages.id as total')
      .first()

    return Number(result?.total || 0)
  }

  /**
   * Get last message in conversation
   * Filter out messages recalled by current user for self (recall_scope = 'self' AND sender_id = userId)
   */
  private async getLastMessage(conversationId: number, userId: number) {
    const result = await Database.from('messages')
      .select(
        'messages.id',
        'messages.message',
        'messages.sender_id',
        'messages.is_recalled',
        'messages.recall_scope',
        'messages.created_at',
        'users.username as sender_name'
      )
      .leftJoin('users', 'messages.sender_id', 'users.id')
      .where('messages.conversation_id', conversationId)
      .whereRaw(
        `(messages.is_recalled = false OR (messages.is_recalled = true AND NOT (messages.recall_scope = 'self' AND messages.sender_id = ?)))`,
        [userId]
      )
      .orderBy('messages.created_at', 'desc')
      .first()

    if (!result) {
      return null
    }

    // If message is recalled for everyone, show replacement text
    if (result.is_recalled && result.recall_scope === 'all') {
      return {
        id: result.id,
        message: 'Tin nhắn này đã bị thu hồi.',
        sender_id: result.sender_id,
        sender_name: result.sender_name,
        is_recalled: true,
        created_at: result.created_at,
      }
    }

    return {
      id: result.id,
      message: result.message,
      sender_id: result.sender_id,
      sender_name: result.sender_name,
      is_recalled: false,
      created_at: result.created_at,
    }
  }
}
