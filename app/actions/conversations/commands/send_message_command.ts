import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Conversation from '#models/conversation'
import Message from '#models/message'
import { DateTime } from 'luxon'
import type { SendMessageDTO } from '../dtos/send_message_dto.js'
import redis from '@adonisjs/redis/services/main'
import Logger from '@adonisjs/core/services/logger'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import type { DatabaseId } from '#types/database'

interface ParticipantResult {
  user_id: DatabaseId
}
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
  constructor(protected ctx: HttpContext) {}

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
    const user = this.ctx.auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    try {
      // Verify user is participant in conversation
      const conversation = await Conversation.query()
        .where('id', dto.conversationId)
        .whereNull('deleted_at')
        .whereHas('participants', (builder) => {
          void builder.where('user_id', user.id)
        })
        .firstOrFail()

      // Verify user belongs to conversation's organization
      // (replaces stored procedure permission check: send_message SP)
      if (conversation.organization_id) {
        const orgMembership: unknown = await db
          .from('organization_users')
          .where('organization_id', conversation.organization_id)
          .where('user_id', user.id)
          .where('status', 'approved')
          .first()

        if (!orgMembership) {
          throw new ForbiddenException('Người gửi không thuộc tổ chức của hội thoại')
        }
      }

      // Log unusually long messages
      if (dto.message.length > 5000) {
        Logger.warn(
          `[SendMessageCommand] Unusually long message from user ${String(user.id)}: ${String(dto.message.length)} characters`
        )
      }

      // Create message via Lucid model (replaces CALL send_message stored procedure)
      const message = await Message.create({
        conversation_id: String(dto.conversationId),
        sender_id: user.id,
        message: dto.trimmedMessage,
      })

      // Update conversation's updated_at
      await conversation.merge({ updated_at: DateTime.now() }).save()

      // Emit domain event (triggers last_message_at + last_message_id update via listener)
      void emitter.emit('message:sent', {
        message,
        conversation,
        senderId: user.id,
      })

      // Invalidate cache for all participants
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
      // Get all participants of this conversation
      const participants = (await db
        .from('conversation_participants')
        .where('conversation_id', conversationId)
        .select('user_id')) as ParticipantResult[]

      const participantIds = participants.map((p) => p.user_id)

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
