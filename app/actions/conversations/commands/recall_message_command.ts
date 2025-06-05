import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import Message from '#models/message'
import ConversationParticipantRepository from '#repositories/conversation_participant_repository'
import { DateTime } from 'luxon'
import type { RecallMessageDTO } from '../dtos/request/recall_message_dto.js'
import redis from '@adonisjs/redis/services/main'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import NotFoundException from '#exceptions/not_found_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { canRecallMessage } from '#domain/conversations/conversation_permission_policy'

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
  constructor(protected execCtx: ExecutionContext) {}

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
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Find message
    const message = await Message.find(dto.messageId)
    if (!message) {
      throw new NotFoundException('Tin nhắn không tồn tại hoặc đã bị xóa')
    }

    // Verify sender and recall eligibility via pure rule
    enforcePolicy(
      canRecallMessage({
        actorId: userId,
        messageSenderId: message.sender_id,
        isAlreadyRecalled: message.is_recalled,
        recallScope: dto.scope,
      })
    )

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

      // Emit domain event (triggers conversation last_message_id recalculation via listener)
      void emitter.emit('message:deleted', {
        messageId: dto.messageId,
        conversationId: message.conversation_id,
      })

      // Invalidate cache
      await this.invalidateCache(message.conversation_id)
    } catch (error) {
      await trx.rollback()
      loggerService.error('[RecallMessageCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate conversation cache
   */
  private async invalidateCache(conversationId: DatabaseId): Promise<void> {
    try {
      // Get all participants → delegate to Model
      const participantIds =
        await ConversationParticipantRepository.getParticipantIds(conversationId)

      // Invalidate conversation list cache
      for (const userId of participantIds) {
        const pattern = `user:${String(userId)}:conversations:*`
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      // Invalidate messages cache
      const messagesPattern = `conversation:${String(conversationId)}:messages:*`
      const messagesKeys = await redis.keys(messagesPattern)
      if (messagesKeys.length > 0) {
        await redis.del(...messagesKeys)
      }

      // Invalidate conversation detail cache
      const detailPattern = `conversation:${String(conversationId)}:detail`
      await redis.del(detailPattern)
    } catch (error) {
      loggerService.error('[RecallMessageCommand.invalidateCache] Error:', error)
      // Don't throw
    }
  }
}
