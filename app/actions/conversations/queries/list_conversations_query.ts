import type { ExecutionContext } from '#types/execution_context'
import ConversationRepository from '#repositories/conversation_repository'
import MessageRepository from '#repositories/message_repository'
import redis from '@adonisjs/redis/services/main'
import type { ListConversationsDTO } from '../dtos/request/list_conversations_dto.js'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'

// Response interfaces
interface ParticipantInfo {
  id: DatabaseId
  username: string | null
  email: string | null
}

interface LastMessageInfo {
  id: DatabaseId
  message: string
  sender_id: DatabaseId
  sender_name: string | null
  is_recalled: boolean
  created_at: string
}

interface ConversationListItem {
  id: DatabaseId
  title: string | null
  created_at: string
  updated_at: string
  unread_count: number
  participant_count: number
  participants: ParticipantInfo[]
  last_message: LastMessageInfo | null
}

interface PaginatedConversations {
  data: ConversationListItem[]
  meta: {
    total: number
    page: number
    limit: number
    lastPage: number
  }
}

/**
 * Query: Lấy danh sách conversations của user
 *
 * Features:
 * - Redis caching per page (5 min)
 * - Filter by current user's participation
 * - Search by conversation title or participant name
 * - Include unread messages count
 * - Include last message
 * - Include all participants
 * - Pagination support
 * - Sort by updated_at DESC (most recent first)
 */
export default class ListConversationsQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: ListConversationsDTO): Promise<PaginatedConversations> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const { page, limit } = dto

    try {
      // Build cache key
      const searchParam = dto.hasSearch ? `:search:${dto.trimmedSearch ?? ''}` : ''
      const cacheKey = `user:${String(userId)}:conversations:page:${String(page)}:limit:${String(limit)}${searchParam}`
      const cached = await redis.get(cacheKey)

      if (cached) {
        return JSON.parse(cached) as PaginatedConversations
      }

      // Get conversations with pagination → delegate to Model
      const { data: conversations, total } = await ConversationRepository.paginateByUser(userId, {
        page,
        limit,
        search: dto.trimmedSearch,
      })

      const lastPage = Math.ceil(total / limit)

      const conversationIds = conversations.map((c: any) => c.id as DatabaseId)

      if (conversationIds.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, limit, lastPage: 0 },
        }
      }

      // For each conversation, get enrichment data → delegate to Model
      const [unreadCounts, participants, lastMessages] = await Promise.all([
        MessageRepository.countUnreadBatch(conversationIds, userId),
        MessageRepository.getParticipantsBatch(conversationIds),
        MessageRepository.getLastMessagesBatch(conversationIds, userId),
      ])

      // Build result
      const data: ConversationListItem[] = conversations.map((conversation: any) => {
        const conversationId = String(conversation.id)
        return {
          id: conversationId,
          title: conversation.title,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          unread_count: unreadCounts.get(conversationId) ?? 0,
          participant_count: participants.get(conversationId)?.length ?? 0,
          participants: participants.get(conversationId) ?? [],
          last_message: lastMessages.get(conversationId) ?? null,
        }
      })

      const result: PaginatedConversations = {
        data,
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
      loggerService.error('[ListConversationsQuery] Error:', error)
      throw error
    }
  }
}
