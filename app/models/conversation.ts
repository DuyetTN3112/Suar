import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import User from './user.js'
import Message from './message.js'
import ConversationParticipant from './conversation_participant.js'
import Organization from './organization.js'

export default class Conversation extends BaseModel {
  static override table = 'conversations'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare title: string | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column()
  declare last_message_id: string | null

  @column()
  declare organization_id: string | null

  @column.dateTime()
  declare last_message_at: DateTime | null

  @hasMany(() => Message)
  declare messages: HasMany<typeof Message>

  @manyToMany(() => User, {
    pivotTable: 'conversation_participants',
  })
  declare participants: ManyToMany<typeof User>

  @hasMany(() => ConversationParticipant, {
    foreignKey: 'conversation_id',
  })
  declare conversation_participants: HasMany<typeof ConversationParticipant>

  @belongsTo(() => Organization, {
    foreignKey: 'organization_id',
  })
  declare organization: BelongsTo<typeof Organization>

  // ===== Static Methods (Fat Model) =====

  /**
   * Tìm conversation mà user có tham gia (chưa bị xóa), hoặc throw error
   */
  static async findWithParticipantOrFail(
    conversationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? this.query({ client: trx }) : this.query()
    const conversation = await query
      .where('id', conversationId)
      .whereNull('deleted_at')
      .whereHas('participants', (participantQuery) => {
        void participantQuery.where('user_id', userId)
      })
      .firstOrFail()
    return conversation
  }

  /**
   * Tìm conversation mà user có tham gia (chưa bị xóa), return null nếu không tìm thấy
   */
  static async findWithParticipant(
    conversationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ) {
    const query = trx ? this.query({ client: trx }) : this.query()
    return query
      .where('id', conversationId)
      .whereNull('deleted_at')
      .whereHas('participants', (participantQuery) => {
        void participantQuery.where('user_id', userId)
      })
      .first()
  }

  /**
   * Lấy danh sách conversations phân trang cho user
   * Return: { data, total }
   */
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

  /**
   * Lấy danh sách conversation IDs trong organization
   * Thay thế: trx.from('conversations').where('organization_id', orgId).select('id')
   */
  static async findIdsByOrganization(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    const query = trx ? this.query({ client: trx }) : this.query()
    const conversations = await query.where('organization_id', organizationId).select('id')
    return conversations.map((c) => String(c.id))
  }

  /**
   * Tìm cuộc hội thoại trực tiếp (1-1) giữa 2 user
   * Thay thế: raw SQL SELECT c.id, COUNT(cp.user_id) ... JOIN ... GROUP BY ... HAVING
   */
  static async findDirectBetween(
    userId1: DatabaseId,
    userId2: DatabaseId
  ): Promise<Conversation | null> {
    // Lấy tất cả conversation của user1
    const user1Conversations = await ConversationParticipant.query()
      .where('user_id', userId1)
      .select('conversation_id')

    if (user1Conversations.length === 0) return null

    const conversationIds = user1Conversations.map((cp) => cp.conversation_id)

    // Tìm conversation nào có user2 và không có title (direct conversation)
    for (const convId of conversationIds) {
      const conversation = await this.query()
        .where('id', convId)
        .whereNull('title')
        .whereNull('deleted_at')
        .first()

      if (!conversation) continue

      // Đếm số participants
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

  /**
   * Tìm cuộc hội thoại nhóm với đúng những participants này
   * Thay thế: raw SQL SELECT c.id, COUNT(cp.user_id) ... GROUP BY ... HAVING count = ?
   */
  static async findGroupWithParticipants(
    participantIds: DatabaseId[]
  ): Promise<Conversation | null> {
    const sortedIds = [...participantIds].map(String).sort()
    const expectedCount = sortedIds.length

    // Lấy conversations của user đầu tiên
    const firstUserConversations = await ConversationParticipant.query()
      .where('user_id', sortedIds[0]!)
      .select('conversation_id')

    if (firstUserConversations.length === 0) return null

    for (const cp of firstUserConversations) {
      const conversation = await this.query()
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
