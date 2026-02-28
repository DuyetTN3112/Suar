import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import User from './user.js'
import Conversation from './conversation.js'

export default class Message extends BaseModel {
  static override table = 'messages'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare conversation_id: string

  @column()
  declare sender_id: string

  @column()
  declare message: string
  @column()
  declare send_status: 'sending' | 'sent' | 'failed'
  @column()
  declare is_recalled: boolean
  @column.dateTime()
  declare recalled_at: DateTime | null
  @column()
  declare recall_scope: 'self' | 'all' | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime
  @column.dateTime()
  declare read_at: DateTime | null

  @belongsTo(() => Conversation, {
    foreignKey: 'conversation_id',
  })
  declare conversation: BelongsTo<typeof Conversation>

  @belongsTo(() => User, {
    foreignKey: 'sender_id',
  })
  declare sender: BelongsTo<typeof User>

  /**
   * Kiểm tra xem tin nhắn có bị thu hồi hiệu quả hay không
   */
  @computed()
  get isEffectivelyRecalled() {
    return this.is_recalled && this.recalled_at !== null && this.recall_scope !== null
  }

  /**
   * Kiểm tra xem tin nhắn có được thu hồi cho tất cả mọi người hay không
   */
  @computed()
  get isRecalledForEveryone() {
    return this.is_recalled && this.recall_scope === 'all'
  }

  /**
   * Lấy thông tin tóm tắt về tin nhắn
   */
  @computed()
  get summary() {
    return {
      id: this.id,
      message: this.message.length > 30 ? `${this.message.substring(0, 30)}...` : this.message,
      is_recalled: this.is_recalled,
      recall_scope: this.recall_scope,
      sender_id: this.sender_id,
      created_at: this.created_at,
      isEffectivelyRecalled: this.isEffectivelyRecalled,
      isRecalledForEveryone: this.isRecalledForEveryone,
    }
  }
  /**
   * Chuyển đổi model thành JSON để trả về cho client
   */
  override toJSON() {
    return {
      id: this.id,
      conversation_id: this.conversation_id,
      sender_id: this.sender_id,
      message: this.message,
      send_status: this.send_status,
      is_recalled: this.is_recalled,
      recalled_at: this.recalled_at,
      recall_scope: this.recall_scope,
      created_at: this.created_at,
      updated_at: this.updated_at,
      read_at: this.read_at,
      isEffectivelyRecalled: this.isEffectivelyRecalled,
      isRecalledForEveryone: this.isRecalledForEveryone,
    }
  }

  // ===== Static Methods (Fat Model) =====

  /**
   * Đánh dấu tất cả tin nhắn chưa đọc trong conversation là đã đọc
   * (chỉ tin nhắn của người khác, không phải của chính mình)
   */
  static async markAllAsReadInConversation(
    conversationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const now = DateTime.now()
    const query = trx ? this.query({ client: trx }) : this.query()
    await query
      .where('conversation_id', conversationId)
      .where('sender_id', '!=', userId)
      .whereNull('read_at')
      .update({
        read_at: now.toSQL(),
        updated_at: now.toSQL(),
      })
  }

  /**
   * Đánh dấu các tin nhắn cụ thể là đã đọc
   */
  static async markSpecificAsRead(
    conversationId: DatabaseId,
    messageIds: DatabaseId[],
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const now = DateTime.now()
    const query = trx ? this.query({ client: trx }) : this.query()
    await query
      .where('conversation_id', conversationId)
      .whereIn('id', messageIds)
      .where('sender_id', '!=', userId)
      .whereNull('read_at')
      .update({
        read_at: now.toSQL(),
        updated_at: now.toSQL(),
      })
  }

  /**
   * Đếm số tin nhắn chưa đọc trong conversation (trừ tin của chính mình và tin recalled for self)
   */
  static async countUnreadInConversation(
    conversationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    const db = (await import('@adonisjs/lucid/services/db')).default
    const client = trx ?? db
    const result = (await client
      .from('messages')
      .where('messages.conversation_id', conversationId)
      .where('messages.sender_id', '!=', userId)
      .whereNull('messages.read_at')
      .whereRaw(
        `(messages.is_recalled = false OR (messages.is_recalled = true AND NOT (messages.recall_scope = 'self' AND messages.sender_id = ?)))`,
        [userId]
      )
      .count('messages.id as total')
      .first()) as { total?: number | string | bigint } | undefined

    return Number(result?.total ?? 0)
  }

  /**
   * Đếm số tin nhắn chưa đọc cho nhiều conversations (batch)
   * Return: Map<conversationId, count>
   */
  static async countUnreadBatch(
    conversationIds: DatabaseId[],
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<Map<string, number>> {
    if (conversationIds.length === 0) return new Map()
    const db = (await import('@adonisjs/lucid/services/db')).default
    const client = trx ?? db
    const results = (await client
      .from('messages')
      .select('messages.conversation_id')
      .count('* as count')
      .whereIn('messages.conversation_id', conversationIds)
      .where('messages.sender_id', '!=', userId)
      .whereNull('messages.read_at')
      .whereRaw(
        `(messages.is_recalled = false OR (messages.is_recalled = true AND NOT (messages.recall_scope = 'self' AND messages.sender_id = ?)))`,
        [userId]
      )
      .groupBy('messages.conversation_id')) as Array<{
      conversation_id: DatabaseId
      count: number | string | bigint
    }>

    const map = new Map<string, number>()
    for (const row of results) {
      map.set(String(row.conversation_id), Number(row.count))
    }
    return map
  }

  /**
   * Lấy last message cho conversation (trừ recalled for self)
   */
  static async getLastMessageInConversation(
    conversationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<{
    id: DatabaseId
    message: string
    sender_id: DatabaseId
    sender_name: string | null
    is_recalled: boolean
    recall_scope: string | null
    created_at: string
  } | null> {
    const db = (await import('@adonisjs/lucid/services/db')).default
    const client = trx ?? db
    const result = (await client
      .from('messages')
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
      .first()) as {
      id: DatabaseId
      message: string
      sender_id: DatabaseId
      sender_name: string | null
      is_recalled: boolean
      recall_scope: string | null
      created_at: string
    } | null

    return result ?? null
  }

  /**
   * Lấy last message cho nhiều conversations (batch)
   * Return: Map<conversationId, lastMessage>
   */
  static async getLastMessagesBatch(
    conversationIds: DatabaseId[],
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<
    Map<
      string,
      {
        id: DatabaseId
        message: string
        sender_id: DatabaseId
        sender_name: string | null
        is_recalled: boolean
        created_at: string
      }
    >
  > {
    if (conversationIds.length === 0) return new Map()
    const db = (await import('@adonisjs/lucid/services/db')).default
    const client = trx ?? db

    const results = (await client
      .from('messages')
      .select(
        'messages.id',
        'messages.conversation_id',
        'messages.message',
        'messages.sender_id',
        'messages.is_recalled',
        'messages.recall_scope',
        'messages.created_at',
        'users.username as sender_name'
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
      .whereRaw(
        `(messages.is_recalled = false OR (messages.is_recalled = true AND NOT (messages.recall_scope = 'self' AND messages.sender_id = ?)))`,
        [userId]
      )) as Array<{
      id: DatabaseId
      conversation_id: DatabaseId
      message: string
      sender_id: DatabaseId
      sender_name: string | null
      is_recalled: boolean
      recall_scope: string | null
      created_at: string
    }>

    const map = new Map<
      string,
      {
        id: DatabaseId
        message: string
        sender_id: DatabaseId
        sender_name: string | null
        is_recalled: boolean
        created_at: string
      }
    >()

    for (const row of results) {
      const message =
        row.is_recalled && row.recall_scope === 'all' ? 'Tin nhắn này đã bị thu hồi.' : row.message

      map.set(String(row.conversation_id), {
        id: row.id,
        message,
        sender_id: row.sender_id,
        sender_name: row.sender_name,
        is_recalled: row.is_recalled,
        created_at: row.created_at,
      })
    }

    return map
  }

  /**
   * Lấy danh sách messages phân trang trong conversation (trừ recalled for self)
   */
  static async paginateByConversation(
    conversationId: DatabaseId,
    userId: DatabaseId,
    options: { page: number; limit: number },
    trx?: TransactionClientContract
  ): Promise<{
    data: Array<{
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
    }>
    total: number
  }> {
    const db = (await import('@adonisjs/lucid/services/db')).default
    const client = trx ?? db
    const offset = (options.page - 1) * options.limit

    const recallFilter = `(messages.is_recalled = false OR (messages.is_recalled = true AND NOT (messages.recall_scope = 'self' AND messages.sender_id = ?)))`

    const [messagesRaw, countRaw] = await Promise.all([
      client
        .from('messages')
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
        .whereRaw(recallFilter, [userId])
        .orderBy('messages.created_at', 'asc')
        .offset(offset)
        .limit(options.limit),
      client
        .from('messages')
        .where('messages.conversation_id', conversationId)
        .whereRaw(recallFilter, [userId])
        .count('* as total')
        .first(),
    ])

    return {
      data: messagesRaw,
      total: Number(countRaw?.total ?? 0),
    }
  }

  /**
   * Lấy participants trong conversation kèm thông tin user (batch)
   */
  static async getParticipantsBatch(
    conversationIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<
    Map<string, Array<{ id: DatabaseId; username: string | null; email: string | null }>>
  > {
    if (conversationIds.length === 0) return new Map()
    const db = (await import('@adonisjs/lucid/services/db')).default
    const client = trx ?? db

    const results = (await client
      .from('conversation_participants')
      .select(
        'conversation_participants.conversation_id',
        'conversation_participants.user_id',
        'users.username as username',
        'users.email as email'
      )
      .join('users', 'conversation_participants.user_id', 'users.id')
      .whereIn('conversation_participants.conversation_id', conversationIds)) as Array<{
      conversation_id: DatabaseId
      user_id: DatabaseId
      username: string | null
      email: string | null
    }>

    const map = new Map<
      string,
      Array<{ id: DatabaseId; username: string | null; email: string | null }>
    >()

    for (const row of results) {
      const convId = String(row.conversation_id)
      if (!map.has(convId)) {
        map.set(convId, [])
      }
      map.get(convId)!.push({
        id: row.user_id,
        username: row.username,
        email: row.email,
      })
    }

    return map
  }
}
