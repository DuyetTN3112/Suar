import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { MarkAsReadDTO, MarkMessagesAsReadDTO } from '../dtos/mark_as_read_dto.js'
import redis from '@adonisjs/redis/services/main'

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
  constructor(protected ctx: HttpContext) {}

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
    const user = this.ctx.auth.user!

    try {
      // Verify user is participant
      const isParticipant = await db
        .from('conversation_participants')
        .where('conversation_id', dto.conversationId)
        .where('user_id', user.id)
        .first()

      if (!isParticipant) {
        throw new Error('Bạn không có quyền truy cập cuộc trò chuyện này')
      }

      // Mark all unread messages as read
      const now = DateTime.now()
      await db
        .from('messages')
        .where('conversation_id', dto.conversationId)
        .where('sender_id', '!=', user.id)
        .whereNull('read_at')
        .update({
          read_at: now.toSQL(),
          updated_at: now.toSQL(),
        })

      // Invalidate cache
      await this.invalidateCache(dto.conversationId, user.id)
    } catch (error) {
      console.error('[MarkAsReadCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate cache
   */
  private async invalidateCache(conversationId: number, userId: number): Promise<void> {
    try {
      // Invalidate conversation list cache (unread count changed)
      const listPattern = `user:${userId}:conversations:*`
      const listKeys = await redis.keys(listPattern)
      if (listKeys.length > 0) {
        await redis.del(...listKeys)
      }

      // Invalidate messages cache
      const messagesPattern = `conversation:${conversationId}:messages:*`
      const messagesKeys = await redis.keys(messagesPattern)
      if (messagesKeys.length > 0) {
        await redis.del(...messagesKeys)
      }

      // Invalidate conversation detail cache
      const detailKey = `conversation:${conversationId}:detail`
      await redis.del(detailKey)
    } catch (error) {
      console.error('[MarkAsReadCommand.invalidateCache] Error:', error)
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
  constructor(protected ctx: HttpContext) {}

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
    const user = this.ctx.auth.user!

    try {
      // Verify user is participant
      const isParticipant = await db
        .from('conversation_participants')
        .where('conversation_id', dto.conversationId)
        .where('user_id', user.id)
        .first()

      if (!isParticipant) {
        throw new Error('Bạn không có quyền truy cập cuộc trò chuyện này')
      }

      // Mark specified messages as read
      const now = DateTime.now()
      await db
        .from('messages')
        .where('conversation_id', dto.conversationId)
        .whereIn('id', dto.uniqueMessageIds)
        .where('sender_id', '!=', user.id)
        .whereNull('read_at')
        .update({
          read_at: now.toSQL(),
          updated_at: now.toSQL(),
        })

      // Invalidate cache
      await this.invalidateCache(dto.conversationId, user.id)
    } catch (error) {
      console.error('[MarkMessagesAsReadCommand] Error:', error)
      throw error
    }
  }

  /**
   * Invalidate cache
   */
  private async invalidateCache(conversationId: number, userId: number): Promise<void> {
    try {
      // Invalidate conversation list cache (unread count changed)
      const listPattern = `user:${userId}:conversations:*`
      const listKeys = await redis.keys(listPattern)
      if (listKeys.length > 0) {
        await redis.del(...listKeys)
      }

      // Invalidate messages cache
      const messagesPattern = `conversation:${conversationId}:messages:*`
      const messagesKeys = await redis.keys(messagesPattern)
      if (messagesKeys.length > 0) {
        await redis.del(...messagesKeys)
      }

      // Invalidate conversation detail cache
      const detailKey = `conversation:${conversationId}:detail`
      await redis.del(detailKey)
    } catch (error) {
      console.error('[MarkMessagesAsReadCommand.invalidateCache] Error:', error)
    }
  }
}
