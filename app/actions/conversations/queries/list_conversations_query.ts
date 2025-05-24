import type { HttpContext } from '@adonisjs/core/http'
import Database from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import { ListConversationsDTO } from '../dtos/list_conversations_dto.js'

interface ConversationListItem {
  id: number
  title: string | null
  created_at: string
  updated_at: string
  unread_count: number
  participant_count: number
  participants: Array<{
    user_id: number
    user_name: string | null
    user_email: string | null
    user_avatar: string | null
  }>
  last_message: {
    id: number
    message: string
    sender_id: number
    sender_name: string | null
    is_recalled: boolean
    created_at: string
  } | null
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
  constructor(protected ctx: HttpContext) {}

  async execute(dto: ListConversationsDTO): Promise<PaginatedConversations> {
    const user = this.ctx.auth.user!
    const { page, limit } = dto

    try {
      // Build cache key
      const searchParam = dto.hasSearch ? `:search:${dto.trimmedSearch}` : ''
      const cacheKey = `user:${user.id}:conversations:page:${page}:limit:${limit}${searchParam}`
      const cached = await redis.get(cacheKey)

      if (cached) {
        return JSON.parse(cached)
      }

      // Base query: get conversations where user is participant
      let conversationsQuery = Database.from('conversations')
        .select(
          'conversations.id',
          'conversations.title',
          'conversations.created_at',
          'conversations.updated_at'
        )
        .join(
          'conversation_participants',
          'conversations.id',
          'conversation_participants.conversation_id'
        )
        .where('conversation_participants.user_id', user.id)
        .whereNull('conversations.deleted_at')
        .groupBy('conversations.id')
        .orderBy('conversations.updated_at', 'desc')

      // Apply search filter
      if (dto.hasSearch) {
        const searchTerm = `%${dto.trimmedSearch}%`
        conversationsQuery = conversationsQuery.where((builder) => {
          builder.where('conversations.title', 'like', searchTerm).orWhereExists((subQuery) => {
            subQuery
              .from('conversation_participants as cp2')
              .join('users', 'cp2.user_id', 'users.id')
              .whereRaw('cp2.conversation_id = conversations.id')
              .where((nameBuilder) => {
                nameBuilder
                  .where('users.first_name', 'like', searchTerm)
                  .orWhere('users.last_name', 'like', searchTerm)
                  .orWhere('users.email', 'like', searchTerm)
              })
          })
        })
      }

      // Count total - Fix DISTINCT syntax for MySQL
      const countQuery = Database.from('conversations')
        .join(
          'conversation_participants',
          'conversations.id',
          'conversation_participants.conversation_id'
        )
        .where('conversation_participants.user_id', user.id)
        .whereNull('conversations.deleted_at')
        .countDistinct('conversations.id as total')

      if (dto.hasSearch) {
        const searchTerm = `%${dto.trimmedSearch}%`
        countQuery.where((builder) => {
          builder.where('conversations.title', 'like', searchTerm).orWhereExists((subQuery) => {
            subQuery
              .from('conversation_participants as cp2')
              .join('users', 'cp2.user_id', 'users.id')
              .whereRaw('cp2.conversation_id = conversations.id')
              .where((nameBuilder) => {
                nameBuilder
                  .where('users.first_name', 'like', searchTerm)
                  .orWhere('users.last_name', 'like', searchTerm)
                  .orWhere('users.email', 'like', searchTerm)
              })
          })
        })
      }

      const [conversations, countResult] = await Promise.all([
        conversationsQuery.offset(dto.offset).limit(limit),
        countQuery.first(),
      ])

      const total = Number(countResult?.total || 0)
      const lastPage = Math.ceil(total / limit)

      // For each conversation, get:
      // 1. Unread count
      // 2. Participants
      // 3. Last message
      const conversationIds = conversations.map((c: any) => c.id)

      if (conversationIds.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, limit, lastPage: 0 },
        }
      }

      const [unreadCounts, participants, lastMessages] = await Promise.all([
        this.getUnreadCounts(conversationIds, user.id),
        this.getParticipants(conversationIds),
        this.getLastMessages(conversationIds, user.id),
      ])

      // Build result
      const data: ConversationListItem[] = conversations.map((conversation: any) => {
        const conversationId = conversation.id
        return {
          id: conversationId,
          title: conversation.title,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          unread_count: unreadCounts.get(conversationId) || 0,
          participant_count: participants.get(conversationId)?.length || 0,
          participants: participants.get(conversationId) || [],
          last_message: lastMessages.get(conversationId) || null,
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
      console.error('[ListConversationsQuery] Error:', error)
      throw error
    }
  }

  /**
   * Get unread message counts for conversations
   */
  private async getUnreadCounts(
    conversationIds: number[],
    userId: number
  ): Promise<Map<number, number>> {
    const results = await Database.from('messages')
      .select('messages.conversation_id')
      .count('* as count')
      .whereIn('messages.conversation_id', conversationIds)
      .where('messages.sender_id', '!=', userId)
      .whereNull('messages.read_at')
      .leftJoin('deleted_messages', function () {
        this.on('deleted_messages.message_id', 'messages.id').andOnVal(
          'deleted_messages.user_id',
          userId
        )
      })
      .whereNull('deleted_messages.id')
      .groupBy('messages.conversation_id')

    const map = new Map<number, number>()
    results.forEach((result: any) => {
      map.set(result.conversation_id, Number(result.count))
    })

    return map
  }

  /**
   * Get participants for conversations
   */
  private async getParticipants(conversationIds: number[]): Promise<Map<number, any[]>> {
    const results = await Database.from('conversation_participants')
      .select(
        'conversation_participants.conversation_id',
        'conversation_participants.user_id',
        Database.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"),
        'users.email as user_email',
        'user_details.avatar_url as user_avatar'
      )
      .join('users', 'conversation_participants.user_id', 'users.id')
      .leftJoin('user_details', 'users.id', 'user_details.user_id')
      .whereIn('conversation_participants.conversation_id', conversationIds)

    const map = new Map<number, any[]>()

    results.forEach((result: any) => {
      const conversationId = result.conversation_id
      if (!map.has(conversationId)) {
        map.set(conversationId, [])
      }

      map.get(conversationId)!.push({
        user_id: result.user_id,
        user_name: result.user_name,
        user_email: result.user_email,
        user_avatar: result.user_avatar,
      })
    })

    return map
  }

  /**
   * Get last messages for conversations
   * Filter out recalled messages (show replacement text) and deleted messages
   */
  private async getLastMessages(
    conversationIds: number[],
    userId: number
  ): Promise<Map<number, any>> {
    // Get latest message for each conversation using subquery
    const results = await Database.from('messages')
      .select(
        'messages.id',
        'messages.conversation_id',
        'messages.message',
        'messages.sender_id',
        'messages.is_recalled',
        'messages.recall_scope',
        'messages.created_at',
        Database.raw("CONCAT(users.first_name, ' ', users.last_name) as sender_name")
      )
      .join('users', 'messages.sender_id', 'users.id')
      .joinRaw(
        `INNER JOIN (
          SELECT conversation_id, MAX(created_at) as max_created_at
          FROM messages
          WHERE conversation_id IN (${conversationIds.join(',')})
          GROUP BY conversation_id
        ) as latest ON messages.conversation_id = latest.conversation_id
          AND messages.created_at = latest.max_created_at`
      )
      .leftJoin('deleted_messages', function () {
        this.on('deleted_messages.message_id', 'messages.id').andOnVal(
          'deleted_messages.user_id',
          userId
        )
      })
      .whereNull('deleted_messages.id')

    const map = new Map<number, any>()

    results.forEach((result: any) => {
      // If recalled for everyone, show replacement text
      const message =
        result.is_recalled && result.recall_scope === 'all'
          ? 'Tin nhắn này đã bị thu hồi.'
          : result.message

      map.set(result.conversation_id, {
        id: result.id,
        message,
        sender_id: result.sender_id,
        sender_name: result.sender_name,
        is_recalled: Boolean(result.is_recalled),
        created_at: result.created_at,
      })
    })

    return map
  }
}
