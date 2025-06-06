import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import Conversation from '#models/conversation'
import ConversationParticipant from '#models/conversation_participant'

/**
 * ConversationRepository
 *
 * Data access for conversations.
 * Extracted from Conversation model static methods.
 */
export default class ConversationRepository {
  static async findWithParticipantOrFail(
    conversationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? Conversation.query({ client: trx }) : Conversation.query()
    return query
      .where('id', conversationId)
      .whereNull('deleted_at')
      .whereHas('participants', (pq) => {
        void pq.where('user_id', userId)
      })
      .firstOrFail()
  }

  static async findWithParticipant(
    conversationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? Conversation.query({ client: trx }) : Conversation.query()
    return query
      .where('id', conversationId)
      .whereNull('deleted_at')
      .whereHas('participants', (pq) => {
        void pq.where('user_id', userId)
      })
      .first()
  }

  static async paginateByUser(
    userId: DatabaseId,
    options: { page: number; limit: number; search?: string },
    trx?: TransactionClientContract
  ): Promise<{
    data: Array<{
      id: DatabaseId
      title: string | null
      created_at: string
      updated_at: string
    }>
    total: number
  }> {
    const db = (await import('@adonisjs/lucid/services/db')).default
    const client = trx ?? db

    let conversationsQuery = client
      .from('conversations')
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
      .where('conversation_participants.user_id', userId)
      .whereNull('conversations.deleted_at')
      .groupBy('conversations.id')
      .orderBy('conversations.updated_at', 'desc')

    const countQuery = client
      .from('conversations')
      .join(
        'conversation_participants',
        'conversations.id',
        'conversation_participants.conversation_id'
      )
      .where('conversation_participants.user_id', userId)
      .whereNull('conversations.deleted_at')
      .countDistinct('conversations.id as total')

    if (options.search && options.search.trim().length > 0) {
      const searchTerm = `%${options.search.trim()}%`
      conversationsQuery = conversationsQuery.where((builder) => {
        void builder.where('conversations.title', 'like', searchTerm).orWhereExists((subQuery) => {
          void subQuery
            .from('conversation_participants as cp2')
            .join('users', 'cp2.user_id', 'users.id')
            .whereRaw('cp2.conversation_id = conversations.id')
            .where((nameBuilder) => {
              void nameBuilder
                .where('users.username', 'like', searchTerm)
                .orWhere('users.email', 'like', searchTerm)
            })
        })
      })

      void countQuery.where((builder) => {
        void builder.where('conversations.title', 'like', searchTerm).orWhereExists((subQuery) => {
          void subQuery
            .from('conversation_participants as cp2')
            .join('users', 'cp2.user_id', 'users.id')
            .whereRaw('cp2.conversation_id = conversations.id')
            .where((nameBuilder) => {
              void nameBuilder
                .where('users.username', 'like', searchTerm)
                .orWhere('users.email', 'like', searchTerm)
            })
        })
      })
    }

    const offset = (options.page - 1) * options.limit
    const [conversations, countResult] = await Promise.all([
      conversationsQuery.offset(offset).limit(options.limit),
      countQuery.first(),
    ])

    return {
      data: conversations,
      total: Number(countResult?.total ?? 0),
    }
  }

  static async findByOrganizationAndParticipant(
    organizationId: DatabaseId,
    userId: DatabaseId
  ): Promise<Conversation[]> {
    return Conversation.query()
      .where('organization_id', organizationId)
      .whereHas('participants', (q) => {
        void q.where('user_id', userId)
      })
      .select('id', 'title')
  }

  static async loadParticipants(conversation: Conversation): Promise<void> {
    await conversation.load('participants')
  }

  static async findIdsByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    const query = trx ? Conversation.query({ client: trx }) : Conversation.query()
    const conversations = await query.where('organization_id', organizationId).select('id')
    return conversations.map((c) => String(c.id))
  }

  static async findDirectBetween(
    userId1: DatabaseId,
    userId2: DatabaseId
  ): Promise<Conversation | null> {
    const user1Conversations = await ConversationParticipant.query()
      .where('user_id', userId1)
      .select('conversation_id')

    if (user1Conversations.length === 0) return null

    const conversationIds = user1Conversations.map((cp) => cp.conversation_id)

    for (const convId of conversationIds) {
      const conversation = await Conversation.query()
        .where('id', convId)
        .whereNull('title')
        .whereNull('deleted_at')
        .first()

      if (!conversation) continue

      const participants = await ConversationParticipant.query()
        .where('conversation_id', convId)
        .select('user_id')

      if (participants.length !== 2) continue

      const participantIds = participants.map((p) => String(p.user_id))
      if (participantIds.includes(String(userId1)) && participantIds.includes(String(userId2))) {
        return conversation
      }
    }

    return null
  }

  static async findGroupWithParticipants(
    participantIds: DatabaseId[]
  ): Promise<Conversation | null> {
    const sortedIds = [...participantIds].map(String).sort()
    const expectedCount = sortedIds.length

    const firstUserConversations = await ConversationParticipant.query()
      .where('user_id', sortedIds[0]!)
      .select('conversation_id')

    if (firstUserConversations.length === 0) return null

    for (const cp of firstUserConversations) {
      const conversation = await Conversation.query()
        .where('id', cp.conversation_id)
        .whereNull('deleted_at')
        .first()

      if (!conversation) continue

      const members = await ConversationParticipant.query()
        .where('conversation_id', cp.conversation_id)
        .select('user_id')

      if (members.length !== expectedCount) continue

      const memberIds = members.map((m) => String(m.user_id)).sort()
      if (JSON.stringify(memberIds) === JSON.stringify(sortedIds)) {
        return conversation
      }
    }

    return null
  }
}
