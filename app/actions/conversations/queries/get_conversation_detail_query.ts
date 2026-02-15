import type { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import redis from '@adonisjs/redis/services/main'
import type { GetConversationDetailDTO } from '../dtos/get_conversation_detail_dto.js'
import { Exception } from '@adonisjs/core/exceptions'
import Database from '@adonisjs/lucid/services/db'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'

interface UnreadCountResult {
  total: number | string | bigint
}

interface LastMessageResult {
  id: DatabaseId
  message: string
  sender_id: DatabaseId
  is_recalled: boolean
  recall_scope: string | null
  created_at: string
  sender_name: string | null
}

interface LastMessageResponse {
  id: DatabaseId
  message: string
  sender_id: DatabaseId
  sender_name: string | null
  is_recalled: boolean
  created_at: string
}

export class NotFoundError extends Exception {
  static override status = 404
  static override code = 'E_CONVERSATION_NOT_FOUND'
  static override message = 'Conversation not found or you do not have access'
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
    const user = this.ctx.auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const { conversationId } = dto

    try {
      // Try cache first
      const cacheKey = `conversation:${String(conversationId)}:detail:user:${String(user.id)}`
      const cached = await redis.get(cacheKey)

      if (cached) {
        return JSON.parse(cached) as Conversation
      }

      // Query conversation
      const conversation = await Conversation.query()
        .where('id', conversationId)
        .whereNull('deleted_at')
        .whereHas('participants', (participantQuery) => {
          void participantQuery.where('user_id', user.id)
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
      // @ts-expect-error - Adding virtual properties
      conversation.unreadCount = unreadCount
      // @ts-expect-error - Adding virtual properties
      conversation.lastMessage = lastMessage

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(conversation))

      return conversation
    } catch (error) {
      loggerService.error('[GetConversationDetailQuery] Error:', error)
      throw error
    }
  }

  /**
   * Get unread message count for a user in conversation
   * Exclude messages recalled by sender for self (recall_scope = 'self' AND sender_id = userId)
   */
  private async getUnreadCount(conversationId: DatabaseId, userId: DatabaseId): Promise<number> {
    const result = (await Database.from('messages')
      .where('messages.conversation_id', conversationId)
      .where('messages.sender_id', '!=', userId)
      .whereNull('messages.read_at')
      .whereRaw(
        `(messages.is_recalled = false OR (messages.is_recalled = true AND NOT (messages.recall_scope = 'self' AND messages.sender_id = ?)))`,
        [userId]
      )
      .count('messages.id as total')
      .first()) as UnreadCountResult | undefined

    return Number(result?.total ?? 0)
  }

  /**
   * Get last message in conversation
   * Filter out messages recalled by current user for self (recall_scope = 'self' AND sender_id = userId)
   */
  private async getLastMessage(
    conversationId: DatabaseId,
    userId: DatabaseId
  ): Promise<LastMessageResponse | null> {
    const result = (await Database.from('messages')
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
      .first()) as LastMessageResult | undefined

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
