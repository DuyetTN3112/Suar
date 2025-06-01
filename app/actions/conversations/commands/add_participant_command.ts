import type { ExecutionContext } from '#types/execution_context'
import ConversationParticipant from '#models/conversation_participant'
import Conversation from '#models/conversation'
import type { AddParticipantDTO } from '../dtos/add_participant_dto.js'
import redis from '@adonisjs/redis/services/main'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ConflictException from '#exceptions/conflict_exception'

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
      // Verify current user is participant → delegate to Model
      const isCurrentUserParticipant = await ConversationParticipant.isParticipant(
        dto.conversationId,
        userId
      )
      if (!isCurrentUserParticipant) {
        throw new ForbiddenException('Bạn không có quyền thêm thành viên vào cuộc trò chuyện này')
      }

      // Verify conversation exists
      const conversation = await Conversation.query()
        .where('id', dto.conversationId)
        .whereNull('deleted_at')
        .firstOrFail()

      // Check if it's a group conversation → delegate to Model
      const count = await ConversationParticipant.countByConversation(dto.conversationId)

      // Only allow adding to group conversations (3+ people or has title)
      if (count < 2 && !conversation.title) {
        throw new BusinessLogicException('Không thể thêm thành viên vào cuộc trò chuyện trực tiếp')
      }

      // Check if user is already a participant → delegate to Model
      const isAlreadyParticipant = await ConversationParticipant.isParticipant(
        dto.conversationId,
        dto.userId
      )
      if (isAlreadyParticipant) {
        throw new ConflictException('Người dùng này đã là thành viên của cuộc trò chuyện')
      }

      // Add participant
      await ConversationParticipant.create({
        conversation_id: String(dto.conversationId),
        user_id: String(dto.userId),
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
      const participantIds = await ConversationParticipant.getParticipantIds(conversationId)

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
