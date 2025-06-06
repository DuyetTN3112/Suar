import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import Message from '#models/message'

/**
 * MessageRepository
 *
 * Data access for messages.
 * Extracted from Message model static methods.
 */
export default class MessageRepository {
  static async markAllAsReadInConversation(
    conversationId: DatabaseId,
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const now = DateTime.now()
    const query = trx ? Message.query({ client: trx }) : Message.query()
    await query
      .where('conversation_id', conversationId)
      .where('sender_id', '!=', userId)
      .whereNull('read_at')
      .update({
        read_at: now.toSQL(),
        updated_at: now.toSQL(),
      })
  }

  static async markSpecificAsRead(
    conversationId: DatabaseId,
    messageIds: DatabaseId[],
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    const now = DateTime.now()
    const query = trx ? Message.query({ client: trx }) : Message.query()
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
          WHERE conversation_id IN (${conversationIds.map(() => '?').join(',')})
          GROUP BY conversation_id
        ) as latest ON messages.conversation_id = latest.conversation_id
          AND messages.created_at = latest.max_created_at`,
        [...conversationIds]
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
