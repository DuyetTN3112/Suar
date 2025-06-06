import type { ExecutionContext } from '#types/execution_context'
import Conversation from '#models/conversation'
import Message from '#models/message'
import ConversationParticipantRepository from '#infra/conversations/repositories/conversation_participant_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import { DateTime } from 'luxon'
import type { SendMessageDTO } from '../dtos/request/send_message_dto.js'
import redis from '@adonisjs/redis/services/main'
import Logger from '@adonisjs/core/services/logger'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'
import type { DatabaseId } from '#types/database'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canSendMessage } from '#domain/conversations/conversation_permission_policy'

/**
 * Command: Send Message
 *
 * Pattern: Message creation with permission check
 * Business rules:
 * - User must be participant in conversation
 * - User must belong to the conversation's organization
 * - Update conversation's updated_at timestamp
 * - Invalidate cache after sending
 * - Log unusually long messages
 *
 * @example
 * const command = new SendMessageCommand(ctx)
 * const message = await command.execute(dto)
 */
export default class SendMessageCommand {
  constructor(protected execCtx: ExecutionContext) {}

  /**
   * Execute command: Send message in conversation
   *
   * Steps:
   * 1. Verify user is participant in conversation
   * 2. Check user belongs to conversation's organization (matches stored proc logic)
   * 3. Log if message is unusually long
   * 4. Create message via Lucid model
   * 5. Update conversation's updated_at
   * 6. Invalidate cache
   * 7. Return created message
   */
  async execute(dto: SendMessageDTO): Promise<Message> {
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

      // Verify permissions via pure rule
      const isParticipant = await ConversationParticipantRepository.isParticipant(
        dto.conversationId,
        userId
      )
      let isOrgMember = true
      if (conversation.organization_id) {
        isOrgMember = await OrganizationUserRepository.isApprovedMember(
          userId,
          conversation.organization_id
        )
      }
      enforcePolicy(
        canSendMessage({
          actorId: userId,
          isParticipant,
          isOrgMember,
          hasOrganization: !!conversation.organization_id,
        })
      )

      // Log unusually long messages
      if (dto.message.length > 5000) {
        Logger.warn(
          `[SendMessageCommand] Unusually long message from user ${String(userId)}: ${String(dto.message.length)} characters`
        )
      }

      // Create message via Lucid model (replaces CALL send_message stored procedure)
      const message = await Message.create({
        conversation_id: String(dto.conversationId),
        sender_id: userId,
        message: dto.trimmedMessage,
      })

      // Update conversation's updated_at
      await conversation.merge({ updated_at: DateTime.now() }).save()

      // Emit domain event (triggers last_message_at + last_message_id update via listener)
      void emitter.emit('message:sent', {
        message,
        conversation,
        senderId: userId,
      })

      // Invalidate cache for all participants → delegate to Model
      await this.invalidateCache(dto.conversationId)

      return message
    } catch (error) {
      loggerService.error('[SendMessageCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate conversation cache for all participants
   */
  private async invalidateCache(conversationId: DatabaseId): Promise<void> {
    try {
      // Get all participants of this conversation → delegate to Model
      const participantIds =
        await ConversationParticipantRepository.getParticipantIds(conversationId)

      // Invalidate conversation list cache for each participant
      for (const userId of participantIds) {
        const pattern = `user:${String(userId)}:conversations:*`
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      // Invalidate conversation detail cache
      const conversationPattern = `conversation:${String(conversationId)}:*`
      const conversationKeys = await redis.keys(conversationPattern)
      if (conversationKeys.length > 0) {
        await redis.del(...conversationKeys)
      }

      // Invalidate messages cache
      const messagesPattern = `conversation:${String(conversationId)}:messages:*`
      const messagesKeys = await redis.keys(messagesPattern)
      if (messagesKeys.length > 0) {
        await redis.del(...messagesKeys)
      }
    } catch (error) {
      loggerService.error('[SendMessageCommand.invalidateCache] Error:', error)
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }
}
