import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import ConversationParticipant from '#models/conversation_participant'
import Conversation from '#models/conversation'
import { AddParticipantDTO } from '../dtos/add_participant_dto.js'
import redis from '@adonisjs/redis/services/main'

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
  constructor(protected ctx: HttpContext) {}

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
    const user = this.ctx.auth.user!

    try {
      // Verify current user is participant
      const currentUserParticipant = await db
        .from('conversation_participants')
        .where('conversation_id', dto.conversationId)
        .where('user_id', user.id)
        .first()

      if (!currentUserParticipant) {
        throw new Error('Bạn không có quyền thêm thành viên vào cuộc trò chuyện này')
      }

      // Verify conversation exists
      const conversation = await Conversation.query()
        .where('id', dto.conversationId)
        .whereNull('deleted_at')
        .firstOrFail()

      // Check if it's a group conversation
      const participantCount = await db
        .from('conversation_participants')
        .where('conversation_id', dto.conversationId)
        .count('* as total')
        .first()

      const count = participantCount?.total || 0

      // Only allow adding to group conversations (3+ people or has title)
      if (count < 2 && !conversation.title) {
        throw new Error('Không thể thêm thành viên vào cuộc trò chuyện trực tiếp')
      }

      // Check if user is already a participant
      const existingParticipant = await db
        .from('conversation_participants')
        .where('conversation_id', dto.conversationId)
        .where('user_id', dto.userId)
        .first()

      if (existingParticipant) {
        throw new Error('Người dùng này đã là thành viên của cuộc trò chuyện')
      }

      // Add participant
      await ConversationParticipant.create({
        conversation_id: dto.conversationId,
        user_id: dto.userId,
      })

      // Invalidate cache
      await this.invalidateCache(dto.conversationId)
    } catch (error) {
      console.error('[AddParticipantCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate cache for conversation and new participant
   */
  private async invalidateCache(conversationId: number): Promise<void> {
    try {
      // Get all participants (including new one)
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
    } catch (error) {
      console.error('[AddParticipantCommand.invalidateCache] Error:', error)
    }
  }
}
