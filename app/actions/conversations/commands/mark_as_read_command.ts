import type { ExecutionContext } from '#types/execution_context'
import ConversationParticipantRepository from '#infra/conversations/repositories/conversation_participant_repository'
import MessageRepository from '#infra/conversations/repositories/message_repository'
import type { MarkAsReadDTO, MarkMessagesAsReadDTO } from '../dtos/request/mark_as_read_dto.js'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

/**
 * Command: Mark Conversation As Read
 *
 * Pattern: Bulk read status update
 * Business rules:
 * - User must be participant in conversation
 * - Marks ALL unread messages as read
 * - Only marks messages where sender is NOT current user
 * - Updates read_at timestamp
 * - Invalidate cache after update
 *
 * @example
 * const command = new MarkAsReadCommand(ctx)
 * await command.execute(dto)
 */
export class MarkAsReadCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command: Mark all messages in conversation as read
   *
   * Steps:
   * 1. Verify user is participant
   * 2. Update all unread messages (where sender != user)
   * 3. Set read_at = now
   * 4. Invalidate cache
   */
  async execute(dto: MarkAsReadDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    try {
      // Verify user is participant → delegate to Model
      const isParticipant = await ConversationParticipantRepository.isParticipant(
        dto.conversationId,
        userId
      )
      if (!isParticipant) {
        throw new ForbiddenException('Bạn không có quyền truy cập cuộc trò chuyện này')
      }

      // Mark all unread messages as read → delegate to Model
      await MessageRepository.markAllAsReadInConversation(dto.conversationId, userId)

      // Invalidate cache
      await this.invalidateCache(dto.conversationId, userId)
    } catch (error) {
      loggerService.error('[MarkAsReadCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate cache
   */
  private async invalidateCache(conversationId: DatabaseId, userId: DatabaseId): Promise<void> {
    try {
      // Invalidate conversation list cache (unread count changed)
      const listPattern = `user:${String(userId)}:conversations:*`
      const listKeys = await redis.keys(listPattern)
      if (listKeys.length > 0) {
        await redis.del(...listKeys)
      }

      // Invalidate messages cache
      const messagesPattern = `conversation:${String(conversationId)}:messages:*`
      const messagesKeys = await redis.keys(messagesPattern)
      if (messagesKeys.length > 0) {
        await redis.del(...messagesKeys)
      }

      // Invalidate conversation detail cache
      const detailKey = `conversation:${String(conversationId)}:detail`
      await redis.del(detailKey)
    } catch (error) {
      loggerService.error('[MarkAsReadCommand.invalidateCache] Error:', error)
    }
  }
}

/**
 * Command: Mark Specific Messages As Read
 *
 * Pattern: Selective read status update
 * Business rules:
 * - User must be participant in conversation
 * - Marks only specified messages as read
 * - Validates messages belong to conversation
 * - Updates read_at timestamp
 * - Invalidate cache after update
 *
 * @example
 * const command = new MarkMessagesAsReadCommand(ctx)
 * await command.execute(dto)
 */
export class MarkMessagesAsReadCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command: Mark specific messages as read
   *
   * Steps:
   * 1. Verify user is participant
   * 2. Validate messages belong to conversation
   * 3. Update read_at for specified messages
   * 4. Invalidate cache
   */
  async execute(dto: MarkMessagesAsReadDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    try {
      // Verify user is participant → delegate to Model
      const isParticipant = await ConversationParticipantRepository.isParticipant(
        dto.conversationId,
        userId
      )
      if (!isParticipant) {
        throw new ForbiddenException('Bạn không có quyền truy cập cuộc trò chuyện này')
      }

      // Mark specified messages as read → delegate to Model
      await MessageRepository.markSpecificAsRead(dto.conversationId, dto.uniqueMessageIds, userId)

      // Invalidate cache
      await this.invalidateCache(dto.conversationId, userId)
    } catch (error) {
      loggerService.error('[MarkMessagesAsReadCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate cache
   */
  private async invalidateCache(conversationId: DatabaseId, userId: DatabaseId): Promise<void> {
    try {
      // Invalidate conversation list cache (unread count changed)
      const listPattern = `user:${String(userId)}:conversations:*`
      const listKeys = await redis.keys(listPattern)
      if (listKeys.length > 0) {
        await redis.del(...listKeys)
      }

      // Invalidate messages cache
      const messagesPattern = `conversation:${String(conversationId)}:messages:*`
      const messagesKeys = await redis.keys(messagesPattern)
      if (messagesKeys.length > 0) {
        await redis.del(...messagesKeys)
      }

      // Invalidate conversation detail cache
      const detailKey = `conversation:${String(conversationId)}:detail`
      await redis.del(detailKey)
    } catch (error) {
      loggerService.error('[MarkMessagesAsReadCommand.invalidateCache] Error:', error)
    }
  }
}
