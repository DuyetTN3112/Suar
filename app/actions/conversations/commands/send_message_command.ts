import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Conversation from '#models/conversation'
import Message from '#models/message'
import { DateTime } from 'luxon'
import { SendMessageDTO } from '../dtos/send_message_dto.js'
import redis from '@adonisjs/redis/services/main'
import Logger from '@adonisjs/core/services/logger'

/**
 * Command: Send Message
 *
 * Pattern: Message creation with permission check
 * Business rules:
 * - User must be participant in conversation
 * - Use stored procedure for atomic message creation
 * - Update conversation's updated_at timestamp
 * - Invalidate cache after sending
 * - Log unusually long messages
 *
 * @example
 * const command = new SendMessageCommand(ctx)
 * const message = await command.execute(dto)
 */
export default class SendMessageCommand {
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute command: Send message in conversation
   *
   * Steps:
   * 1. Verify user is participant in conversation
   * 2. Check conversation exists and not deleted
   * 3. Log if message is unusually long
   * 4. Use stored procedure to create message
   * 5. Update conversation's updated_at
   * 6. Invalidate cache
   * 7. Return created message
   */
  async execute(dto: SendMessageDTO): Promise<Message> {
    const user = this.ctx.auth.user!

    try {
      // Verify user is participant in conversation
      const conversation = await Conversation.query()
        .where('id', dto.conversationId)
        .whereNull('deleted_at')
        .whereHas('participants', (builder) => {
          builder.where('user_id', user.id)
        })
        .firstOrFail()

      // Log unusually long messages
      if (dto.message.length > 5000) {
        Logger.warn(
          `[SendMessageCommand] Unusually long message from user ${user.id}: ${dto.message.length} characters`
        )
      }

      // Use stored procedure to send message
      try {
        await db.rawQuery('CALL send_message(?, ?, ?)', [
          dto.conversationId,
          user.id,
          dto.trimmedMessage,
        ])
      } catch (dbError: any) {
        // Log detailed error for debugging
        Logger.error(`[SendMessageCommand] Database error for user ${user.id}:`, {
          error: dbError.message,
          code: dbError.code,
          sqlState: dbError.sqlState,
          conversationId: dto.conversationId,
        })

        // Throw user-friendly error
        if (dbError.sqlState === '45000') {
          // Custom MySQL error from stored procedure
          throw new Error(dbError.message)
        }

        throw new Error('Không thể gửi tin nhắn. Vui lòng thử lại sau.')
      }

      // Update conversation's updated_at
      await conversation.merge({ updated_at: DateTime.now() }).save()

      // Get the created message
      const message = await Message.query()
        .where('conversation_id', dto.conversationId)
        .where('sender_id', user.id)
        .orderBy('created_at', 'desc')
        .firstOrFail()

      // Invalidate cache for all participants
      await this.invalidateCache(dto.conversationId)

      return message
    } catch (error) {
      console.error('[SendMessageCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate conversation cache for all participants
   */
  private async invalidateCache(conversationId: number): Promise<void> {
    try {
      // Get all participants of this conversation
      const participants = await db
        .from('conversation_participants')
        .where('conversation_id', conversationId)
        .select('user_id')

      const participantIds = participants.map((p) => p.user_id)

      // Invalidate conversation list cache for each participant
      for (const userId of participantIds) {
        const pattern = `user:${userId}:conversations:*`
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      // Invalidate conversation detail cache
      const conversationPattern = `conversation:${conversationId}:*`
      const conversationKeys = await redis.keys(conversationPattern)
      if (conversationKeys.length > 0) {
        await redis.del(...conversationKeys)
      }

      // Invalidate messages cache
      const messagesPattern = `conversation:${conversationId}:messages:*`
      const messagesKeys = await redis.keys(messagesPattern)
      if (messagesKeys.length > 0) {
        await redis.del(...messagesKeys)
      }
    } catch (error) {
      console.error('[SendMessageCommand.invalidateCache] Error:', error)
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }
}
