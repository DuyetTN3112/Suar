import type { ExecutionContext } from '#types/execution_context'
import Conversation from '#models/conversation'
import ConversationParticipantRepository from '#repositories/conversation_participant_repository'
import { DateTime } from 'luxon'
import type { DeleteConversationDTO } from '../dtos/delete_conversation_dto.js'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import emitter from '@adonisjs/core/services/emitter'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { canDeleteConversation } from '#domain/conversations/conversation_permission_policy'

/**
 * Command: Delete Conversation (Soft Delete)
 *
 * Pattern: Soft delete for data retention
 * Business rules:
 * - Only participants can delete conversation
 * - Soft delete only (sets deleted_at timestamp)
 * - All messages remain in database
 * - Can be restored by clearing deleted_at
 * - Invalidate cache after deletion
 *
 * @example
 * const command = new DeleteConversationCommand(ctx)
 * await command.execute(dto)
 */
export default class DeleteConversationCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command: Soft delete conversation
   *
   * Steps:
   * 1. Verify user is participant
   * 2. Verify conversation exists and not already deleted
   * 3. Set deleted_at timestamp
   * 4. Invalidate cache
   */
  async execute(dto: DeleteConversationDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    try {
      // Find conversation
      const conversation = await Conversation.query()
        .where('id', dto.conversationId)
        .whereNull('deleted_at')
        .first()
      if (!conversation) {
        throw new NotFoundException('Cuộc trò chuyện không tồn tại')
      }

      // Verify user is participant via pure rule
      const isParticipant = await ConversationParticipantRepository.isParticipant(dto.conversationId, userId)
      enforcePolicy(canDeleteConversation({ actorId: userId, isParticipant }))

      // Soft delete conversation
      conversation.deleted_at = DateTime.now()
      await conversation.save()

      // Emit audit event
      void emitter.emit('audit:log', {
        userId,
        action: 'delete',
        entityType: 'conversation',
        entityId: dto.conversationId,
      })

      // Invalidate cache → delegate to Model for participant IDs
      await this.invalidateCache(dto.conversationId)
    } catch (error) {
      loggerService.error('[DeleteConversationCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate cache for all participants
   */
  private async invalidateCache(conversationId: DatabaseId): Promise<void> {
    try {
      // Get all participants → delegate to Model
      const participantIds = await ConversationParticipantRepository.getParticipantIds(conversationId)

      // Invalidate conversation list cache for all participants
      for (const userId of participantIds) {
        const pattern = `user:${String(userId)}:conversations:*`
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      // Invalidate conversation detail cache
      const detailKey = `conversation:${String(conversationId)}:detail`
      await redis.del(detailKey)

      // Invalidate messages cache
      const messagesPattern = `conversation:${String(conversationId)}:messages:*`
      const messagesKeys = await redis.keys(messagesPattern)
      if (messagesKeys.length > 0) {
        await redis.del(...messagesKeys)
      }
    } catch (error) {
      loggerService.error('[DeleteConversationCommand.invalidateCache] Error:', error)
    }
  }
}
