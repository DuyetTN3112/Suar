import type { ExecutionContext } from '#types/execution_context'
import ConversationParticipant from '#models/conversation_participant'
import ConversationParticipantRepository from '#repositories/conversation_participant_repository'
import Conversation from '#models/conversation'
import type { AddParticipantDTO } from '../dtos/add_participant_dto.js'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import emitter from '@adonisjs/core/services/emitter'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { canAddParticipant } from '#domain/conversations/conversation_permission_policy'

/**
 * Command: Add Participant To Conversation
 *
 * Pattern: Conversation membership management
 * Business rules:
 * - Only existing participants can add new members
 * - Cannot add duplicate participants
 * - Group conversations only (not direct 1-1)
 * - New participant gets access to future messages
 * - Invalidate cache after adding
 *
 * @example
 * const command = new AddParticipantCommand(ctx)
 * await command.execute(dto)
 */
export default class AddParticipantCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command: Add participant to conversation
   *
   * Steps:
   * 1. Verify current user is participant
   * 2. Verify conversation exists and not deleted
   * 3. Check if it's a group conversation (has title or 3+ participants)
   * 4. Check if user already participant
   * 5. Add participant
   * 6. Invalidate cache
   */
  async execute(dto: AddParticipantDTO): Promise<void> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    try {
      // Pre-fetch context for pure rule
      const isCurrentUserParticipant = await ConversationParticipantRepository.isParticipant(
        dto.conversationId,
        userId
      )

      // Verify conversation exists
      const conversation = await Conversation.query()
        .where('id', dto.conversationId)
        .whereNull('deleted_at')
        .firstOrFail()

      const count = await ConversationParticipantRepository.countByConversation(dto.conversationId)
      const isAlreadyParticipant = await ConversationParticipantRepository.isParticipant(
        dto.conversationId,
        dto.userId
      )

      // Validate via pure rule
      enforcePolicy(
        canAddParticipant({
          actorId: userId,
          targetUserId: dto.userId,
          isActorParticipant: isCurrentUserParticipant,
          isTargetAlreadyParticipant: isAlreadyParticipant,
          participantCount: count,
          hasTitle: !!conversation.title,
        })
      )

      // Add participant
      await ConversationParticipant.create({
        conversation_id: String(dto.conversationId),
        user_id: String(dto.userId),
      })

      // Emit audit event
      void emitter.emit('audit:log', {
        userId,
        action: 'create',
        entityType: 'conversation_participant',
        entityId: dto.conversationId,
        newValues: { added_user_id: dto.userId },
      })

      // Invalidate cache → delegate to Model for participant IDs
      await this.invalidateCache(dto.conversationId)
    } catch (error) {
      loggerService.error('[AddParticipantCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate cache for conversation and new participant
   */
  private async invalidateCache(conversationId: DatabaseId): Promise<void> {
    try {
      // Get all participants (including new one) → delegate to Model
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
    } catch (error) {
      loggerService.error('[AddParticipantCommand.invalidateCache] Error:', error)
    }
  }
}
