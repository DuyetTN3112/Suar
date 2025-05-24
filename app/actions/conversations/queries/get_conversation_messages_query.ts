import type { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import redis from '@adonisjs/redis/services/main'
import { GetConversationMessagesDTO } from '../dtos/get_conversation_messages_dto.js'
import { Exception } from '@adonisjs/core/exceptions'
import Database from '@adonisjs/lucid/services/db'

export class NotFoundError extends Exception {
  static status = 404
  static code = 'E_CONVERSATION_NOT_FOUND'
  static message = 'Conversation not found or you do not have access'
}

interface MessageWithSender {
  id: number
  message: string
  sender_id: number
  sender_name: string | null
  sender_email: string | null
  sender_avatar: string | null
  is_recalled: boolean
  recall_scope: string | null
  recalled_at: string | null
  read_at: string | null
  created_at: string
  updated_at: string
  is_deleted_for_me: boolean
}

interface PaginatedMessages {
  data: MessageWithSender[]
  meta: {
    total: number
    page: number
    limit: number
    lastPage: number
  }
}

/**
 * Query: Lấy messages của conversation với pagination
 *
 * Features:
 * - Redis caching per page (5 min)
 * - Verify user is participant
 * - Filter recalled messages (show "Tin nhắn này đã bị thu hồi" if recall_scope = 'all')
 * - Filter messages deleted by current user (deleted_messages table)
 * - Preload sender info
 * - Pagination support
 */
export default class GetConversationMessagesQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(dto: GetConversationMessagesDTO): Promise<PaginatedMessages> {
    const user = this.ctx.auth.user!
    const { conversationId, page, limit } = dto

    try {
      // Verify user is participant
      const conversation = await Conversation.query()
        .where('id', conversationId)
        .whereNull('deleted_at')
        .whereHas('participants', (participantQuery) => {
          participantQuery.where('user_id', user.id)
        })
        .first()

      if (!conversation) {
        throw new NotFoundError()
      }

      // Try cache
      const cacheKey = `conversation:${conversationId}:messages:page:${page}:limit:${limit}:user:${user.id}`
      const cached = await redis.get(cacheKey)

      if (cached) {
        return JSON.parse(cached)
      }

      // Get messages with sender info
      const messagesQuery = Database.from('messages')
        .select(
          'messages.id',
          'messages.conversation_id',
          'messages.message',
          'messages.sender_id',
          'messages.is_recalled',
          'messages.recall_scope',
          'messages.recalled_at',
          'messages.read_at',
          'messages.created_at',
          'messages.updated_at',
          Database.raw(
            "CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, '')) as sender_name"
          ),
          'users.email as sender_email',
          'user_details.avatar_url as sender_avatar',
          Database.raw(
            'CASE WHEN deleted_messages.id IS NOT NULL THEN 1 ELSE 0 END as is_deleted_for_me'
          )
        )
        .leftJoin('users', 'messages.sender_id', 'users.id')
        .leftJoin('user_details', 'users.id', 'user_details.user_id')
        .leftJoin('deleted_messages', function () {
          this.on('deleted_messages.message_id', 'messages.id').andOnVal(
            'deleted_messages.user_id',
            user.id
          )
        })
        .where('messages.conversation_id', conversationId)
        .orderBy('messages.created_at', 'asc')

      // Count total (exclude messages deleted by current user)
      const countQuery = Database.from('messages')
        .leftJoin('deleted_messages', function () {
          this.on('deleted_messages.message_id', 'messages.id').andOnVal(
            'deleted_messages.user_id',
            user.id
          )
        })
        .where('messages.conversation_id', conversationId)
        .whereNull('deleted_messages.id')
        .count('* as total')

      const [messages, countResult] = await Promise.all([
        messagesQuery.offset(dto.offset).limit(limit),
        countQuery.first(),
      ])

      const total = Number(countResult?.total || 0)
      const lastPage = Math.ceil(total / limit)

      // Process messages: replace recalled message content if needed
      const processedMessages: MessageWithSender[] = messages.map((msg: any) => {
        // If message is recalled for everyone, replace content
        if (msg.is_recalled && msg.recall_scope === 'all') {
          return {
            ...msg,
            message: 'Tin nhắn này đã bị thu hồi.',
            is_deleted_for_me: Boolean(msg.is_deleted_for_me),
          }
        }

        return {
          ...msg,
          is_deleted_for_me: Boolean(msg.is_deleted_for_me),
        }
      })

      const result: PaginatedMessages = {
        data: processedMessages,
        meta: {
          total,
          page,
          limit,
          lastPage,
        },
      }

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(result))

      return result
    } catch (error) {
      console.error('[GetConversationMessagesQuery] Error:', error)
      throw error
    }
  }
}
