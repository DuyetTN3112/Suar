import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Message from '#models/message'
import { DateTime } from 'luxon'
import { RecallMessageDTO } from '../dtos/recall_message_dto.js'
import redis from '@adonisjs/redis/services/main'
import { Exception } from '@adonisjs/core/exceptions'

// Custom exceptions
class NotFoundError extends Exception {
  static status = 404
  static code = 'E_NOT_FOUND'
}

class UnauthorizedError extends Exception {
  static status = 401
  static code = 'E_UNAUTHORIZED'
}

/**
 * Command: Recall Message
 *
 * Pattern: Message recall with scope control
 * Business rules:
 * - Only sender can recall message
 * - Scope 'all': Updates message content, sets is_recalled = true, recall_scope = 'all'
 * - Scope 'self': Sets is_recalled = true, recall_scope = 'self' (only visible to sender)
 * - Cannot recall already recalled messages
 * - Transaction for data consistency
 * - Invalidate cache after recall
 *
 * @example
 * const command = new RecallMessageCommand(ctx)
 * await command.execute(dto)
 */
export default class RecallMessageCommand {
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute command: Recall message
   *
   * Steps:
   * 1. Find message
   * 2. Verify sender is current user
   * 3. Begin transaction
   * 4. If scope='all': Update message content, is_recalled, recall_scope, recalled_at
   * 5. If scope='self': Update is_recalled, recall_scope, recalled_at
   * 6. Commit transaction
   * 7. Invalidate cache
   */
  async execute(dto: RecallMessageDTO): Promise<void> {
    const user = this.ctx.auth.user!

    // Find message
    const message = await Message.find(dto.messageId)
    if (!message) {
      throw new NotFoundError('Tin nhắn không tồn tại hoặc đã bị xóa')
    }

    // Verify sender
    if (message.sender_id !== user.id) {
      throw new UnauthorizedError('Bạn không có quyền thu hồi tin nhắn này')
    }

    // Check if already recalled
    if (message.is_recalled) {
      throw new Error('Tin nhắn này đã được thu hồi trước đó')
    }

    const trx = await db.transaction()

    try {
      message.useTransaction(trx)

      // Update message with recall information
      message.is_recalled = true
      message.recalled_at = DateTime.now()

      if (dto.isRecallForEveryone) {
        // Recall for everyone: Update message content and set scope
        message.recall_scope = 'all'
        message.message = dto.replacementMessage
      } else if (dto.isRecallForSelf) {
        // Recall for self: Set scope to self
        message.recall_scope = 'self'
      }

      await message.save()

      await trx.commit()

      // Invalidate cache
      await this.invalidateCache(message.conversation_id)
    } catch (error) {
      await trx.rollback()
      console.error('[RecallMessageCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate conversation cache
   */
  private async invalidateCache(conversationId: number): Promise<void> {
    try {
      // Get all participants
      const participants = await db
        .from('conversation_participants')
        .where('conversation_id', conversationId)
        .select('user_id')

      const participantIds = participants.map((p) => p.user_id)

      // Invalidate conversation list cache
      for (const userId of participantIds) {
        const pattern = `user:${userId}:conversations:*`
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      // Invalidate messages cache
      const messagesPattern = `conversation:${conversationId}:messages:*`
      const messagesKeys = await redis.keys(messagesPattern)
      if (messagesKeys.length > 0) {
        await redis.del(...messagesKeys)
      }

      // Invalidate conversation detail cache
      const detailPattern = `conversation:${conversationId}:detail`
      await redis.del(detailPattern)
    } catch (error) {
      console.error('[RecallMessageCommand.invalidateCache] Error:', error)
      // Don't throw
    }
  }
}
