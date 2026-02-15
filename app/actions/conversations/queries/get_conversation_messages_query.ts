import type { HttpContext } from '@adonisjs/core/http'
import Conversation from '#models/conversation'
import redis from '@adonisjs/redis/services/main'
import type { GetConversationMessagesDTO } from '../dtos/get_conversation_messages_dto.js'
import { Exception } from '@adonisjs/core/exceptions'
import Database from '@adonisjs/lucid/services/db'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'

export class NotFoundError extends Exception {
  static override status = 404
  static override code = 'E_CONVERSATION_NOT_FOUND'
  static override message = 'Conversation not found or you do not have access'
}

interface MessageRow {
  id: DatabaseId
  conversation_id: DatabaseId
  message: string
  sender_id: DatabaseId
  is_recalled: boolean
  recall_scope: string | null
  recalled_at: string | null
  read_at: string | null
  created_at: string
  updated_at: string
  sender_name: string | null
  sender_email: string | null
}

interface CountResult {
  total: number | string | bigint
}

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
  constructor(protected ctx: HttpContext) {}

  async execute(dto: GetConversationMessagesDTO): Promise<PaginatedMessages> {
    const user = this.ctx.auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const { conversationId, page, limit } = dto

    try {
      // Verify user is participant
      const conversation = await Conversation.query()
        .where('id', conversationId)
        .whereNull('deleted_at')
        .whereHas('participants', (participantQuery) => {
          void participantQuery.where('user_id', user.id)
        })
        .first()

      if (!conversation) {
        throw new NotFoundError()
      }

      // Try cache
      const cacheKey = `conversation:${String(conversationId)}:messages:page:${String(page)}:limit:${String(limit)}:user:${String(user.id)}`
      const cached = await redis.get(cacheKey)

      if (cached) {
        return JSON.parse(cached) as PaginatedMessages
      }

      // Get messages with sender info
      // Filter out messages recalled by current user for self
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
          'users.username as sender_name',
          'users.email as sender_email'
        )
        .leftJoin('users', 'messages.sender_id', 'users.id')
        .where('messages.conversation_id', conversationId)
        .whereRaw(
          `(messages.is_recalled = false OR (messages.is_recalled = true AND NOT (messages.recall_scope = 'self' AND messages.sender_id = ?)))`,
          [user.id]
        )
        .orderBy('messages.created_at', 'asc')

      // Count total (exclude messages recalled by current user for self)
      const countQuery = Database.from('messages')
        .where('messages.conversation_id', conversationId)
        .whereRaw(
          `(messages.is_recalled = false OR (messages.is_recalled = true AND NOT (messages.recall_scope = 'self' AND messages.sender_id = ?)))`,
          [user.id]
        )
        .count('* as total')

      const promiseResults: [unknown, unknown] = await Promise.all([
        messagesQuery.offset(dto.offset).limit(limit),
        countQuery.first(),
      ])

      const messages = promiseResults[0] as MessageRow[]
      const countResult = promiseResults[1] as CountResult | undefined

      const total = Number(countResult?.total ?? 0)
      const lastPage = Math.ceil(total / limit)

      // Process messages: replace recalled message content if needed
      const processedMessages: MessageWithSender[] = messages.map((msg) => {
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
