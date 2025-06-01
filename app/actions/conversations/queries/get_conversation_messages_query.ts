import type { ExecutionContext } from '#types/execution_context'
import Conversation from '#models/conversation'
import Message from '#models/message'
import redis from '@adonisjs/redis/services/main'
import type { GetConversationMessagesDTO } from '../dtos/get_conversation_messages_dto.js'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'

interface MessageWithSender {
  id: DatabaseId
  message: string
  sender_id: DatabaseId
  sender_name: string | null
  sender_email: string | null
  is_recalled: boolean
  recall_scope: string | null
  recalled_at: string | null
  read_at: string | null
  created_at: string
  updated_at: string
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
 * - Filter messages recalled by sender for self (recall_scope = 'self' AND sender_id = userId)
 * - Preload sender info
 * - Pagination support
 */
export default class GetConversationMessagesQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: GetConversationMessagesDTO): Promise<PaginatedMessages> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const { conversationId, page, limit } = dto

    try {
      // Verify user is participant → delegate to Model
      const conversation = await Conversation.findWithParticipant(conversationId, userId)
      if (!conversation) {
        throw NotFoundException.resource('Cuộc trò chuyện')
      }

      // Try cache
      const cacheKey = `conversation:${String(conversationId)}:messages:page:${String(page)}:limit:${String(limit)}:user:${String(userId)}`
      const cached = await redis.get(cacheKey)

      if (cached) {
        return JSON.parse(cached) as PaginatedMessages
      }

      // Get messages with pagination → delegate to Model
      const { data: messages, total } = await Message.paginateByConversation(
        conversationId,
        userId,
        { page, limit }
      )

      const lastPage = Math.ceil(total / limit)

      // Process messages: replace recalled message content if needed
      const processedMessages: MessageWithSender[] = messages.map((msg: any) => {
        // If message is recalled for everyone, replace content
        if (msg.is_recalled && msg.recall_scope === 'all') {
          return {
            id: msg.id,
            message: 'Tin nhắn này đã bị thu hồi.',
            sender_id: msg.sender_id,
            sender_name: msg.sender_name,
            sender_email: msg.sender_email,
            is_recalled: msg.is_recalled,
            recall_scope: msg.recall_scope,
            recalled_at: msg.recalled_at,
            read_at: msg.read_at,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
          }
        }

        return {
          id: msg.id,
          message: msg.message,
          sender_id: msg.sender_id,
          sender_name: msg.sender_name,
          sender_email: msg.sender_email,
          is_recalled: msg.is_recalled,
          recall_scope: msg.recall_scope,
          recalled_at: msg.recalled_at,
          read_at: msg.read_at,
          created_at: msg.created_at,
          updated_at: msg.updated_at,
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
      loggerService.error('[GetConversationMessagesQuery] Error:', error)
      throw error
    }
  }
}
