import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Conversation from '#models/conversation'
import { DateTime } from 'luxon'
import { DeleteConversationDTO } from '../dtos/delete_conversation_dto.js'
import redis from '@adonisjs/redis/services/main'

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
  constructor(protected ctx: HttpContext) {}

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
    const user = this.ctx.auth.user!

    try {
      // Verify user is participant and conversation exists
      const conversation = await Conversation.query()
        .where('id', dto.conversationId)
        .whereNull('deleted_at')
        .whereHas('participants', (builder) => {
          builder.where('user_id', user.id)
        })
        .firstOrFail()

      // Soft delete conversation
      conversation.deleted_at = DateTime.now()
      await conversation.save()

      // Invalidate cache
      await this.invalidateCache(dto.conversationId)
    } catch (error) {
      console.error('[DeleteConversationCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate cache for all participants
   */
  private async invalidateCache(conversationId: number): Promise<void> {
    try {
      // Get all participants
      const participants = await db
        .from('conversation_participants')
        .where('conversation_id', conversationId)
        .select('user_id')

      const participantIds = participants.map((p) => p.user_id)

      // Invalidate conversation list cache for all participants
      for (const userId of participantIds) {
        const pattern = `user:${userId}:conversations:*`
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }

      // Invalidate conversation detail cache
      const detailKey = `conversation:${conversationId}:detail`
      await redis.del(detailKey)

      // Invalidate messages cache
      const messagesPattern = `conversation:${conversationId}:messages:*`
      const messagesKeys = await redis.keys(messagesPattern)
      if (messagesKeys.length > 0) {
        await redis.del(...messagesKeys)
      }
    } catch (error) {
      console.error('[DeleteConversationCommand.invalidateCache] Error:', error)
    }
  }
}
