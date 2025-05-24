import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Conversation from '#models/conversation'
import Message from '#models/message'
import { DateTime } from 'luxon'
import { CreateConversationDTO } from '../dtos/create_conversation_dto.js'
import redis from '@adonisjs/redis/services/main'

/**
 * Command: Create Conversation
 *
 * Pattern: Complex conversation creation with deduplication
 * Business rules:
 * - Check for existing direct (1-1) conversations before creating new
 * - Check for existing group conversations with same participants
 * - Use stored procedure for atomic creation
 * - Support initial message on creation
 * - Auto-include creator as participant
 * - Invalidate cache after creation
 *
 * @example
 * const command = new CreateConversationCommand(ctx)
 * const conversation = await command.execute(dto)
 */
export default class CreateConversationCommand {
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute command: Create conversation or return existing one
   *
   * Steps:
   * 1. Get all participant IDs (including creator)
   * 2. Check for existing direct conversation (if 1-1)
   * 3. Check for existing group conversation (if 3+ participants)
   * 4. If exists: Add initial message if provided
   * 5. If not exists: Use stored procedure to create
   * 6. Add initial message if provided
   * 7. Invalidate cache
   * 8. Return conversation
   */
  async execute(dto: CreateConversationDTO): Promise<Conversation> {
    const user = this.ctx.auth.user!

    // Get all participants including creator
    const allParticipantIds = dto.getAllParticipantIds(user.id)

    try {
      // For direct (1-1) conversations, check if exists
      if (dto.isDirect) {
        const otherUserId = dto.participantIds[0]
        const existing = await this.findExistingDirectConversation(user.id, otherUserId)

        if (existing) {
          // Add initial message if provided
          if (dto.initialMessage) {
            await this.addMessage(existing.id, user.id, dto.initialMessage)
            await existing.merge({ updated_at: DateTime.now() }).save()
          }

          return existing
        }
      }

      // For group conversations (3+ people), check if exists
      if (dto.isGroup) {
        const existing = await this.findExistingGroupConversation(allParticipantIds)

        if (existing) {
          // Add initial message if provided
          if (dto.initialMessage) {
            await this.addMessage(existing.id, user.id, dto.initialMessage)
            await existing.merge({ updated_at: DateTime.now() }).save()
          }

          return existing
        }
      }

      // Create new conversation using stored procedure
      const conversation = await this.createNewConversation(
        user.id,
        dto.participantIds,
        dto.title,
        dto.organizationId
      )

      // Add initial message if provided
      if (dto.initialMessage) {
        await this.addMessage(conversation.id, user.id, dto.initialMessage)
      }

      // Invalidate cache
      await this.invalidateCache(allParticipantIds)

      return conversation
    } catch (error) {
      console.error('[CreateConversationCommand] Error:', error)
      throw error
    }
  }

  /**
   * Find existing direct (1-1) conversation between two users
   */
  private async findExistingDirectConversation(
    userId1: number,
    userId2: number
  ): Promise<Conversation | null> {
    try {
      // Find conversations with exactly 2 participants
      const conversationsWithCount = await db.rawQuery<Array<{ id: number }>>(
        `
        SELECT c.id, COUNT(cp.user_id) as participant_count
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE c.title IS NULL AND c.deleted_at IS NULL
        GROUP BY c.id
        HAVING participant_count = 2
      `
      )

      if (!conversationsWithCount || conversationsWithCount.length === 0) {
        return null
      }

      const potentialIds = conversationsWithCount.map((row) => row.id)

      // Find conversations with both users
      const participantsData = await db.rawQuery<
        Array<{ conversation_id: number; user_id: number }>
      >(
        `
        SELECT conversation_id, user_id
        FROM conversation_participants
        WHERE conversation_id IN (${potentialIds.map(() => '?').join(',')})
          AND user_id IN (?, ?)
      `,
        [...potentialIds, userId1, userId2]
      )

      // Group by conversation
      const participantsByConversation = new Map<number, Set<number>>()
      participantsData.forEach((row) => {
        if (!participantsByConversation.has(row.conversation_id)) {
          participantsByConversation.set(row.conversation_id, new Set())
        }
        participantsByConversation.get(row.conversation_id)!.add(row.user_id)
      })

      // Find conversation with exactly these 2 users
      for (const [conversationId, participants] of participantsByConversation.entries()) {
        if (participants.has(userId1) && participants.has(userId2) && participants.size === 2) {
          return await Conversation.find(conversationId)
        }
      }

      return null
    } catch (error) {
      console.error('[CreateConversationCommand.findExistingDirectConversation] Error:', error)
      return null
    }
  }

  /**
   * Find existing group conversation with exact same participants
   */
  private async findExistingGroupConversation(
    participantIds: number[]
  ): Promise<Conversation | null> {
    try {
      const sortedIds = [...participantIds].sort((a, b) => a - b)

      // Find conversations with exact participant count
      const conversationsWithCount = await db.rawQuery<Array<{ id: number }>>(
        `
        SELECT c.id, COUNT(cp.user_id) as participant_count
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE c.deleted_at IS NULL
        GROUP BY c.id
        HAVING participant_count = ?
      `,
        [sortedIds.length]
      )

      if (!conversationsWithCount || conversationsWithCount.length === 0) {
        return null
      }

      const potentialIds = conversationsWithCount.map((row) => row.id)

      // Get all participants for these conversations
      const participantsData = await db.rawQuery<
        Array<{ conversation_id: number; user_id: number }>
      >(
        `
        SELECT conversation_id, user_id
        FROM conversation_participants
        WHERE conversation_id IN (${potentialIds.map(() => '?').join(',')})
      `,
        [...potentialIds]
      )

      // Group by conversation
      const participantsByConversation = new Map<number, Set<number>>()
      participantsData.forEach((row) => {
        if (!participantsByConversation.has(row.conversation_id)) {
          participantsByConversation.set(row.conversation_id, new Set())
        }
        participantsByConversation.get(row.conversation_id)!.add(row.user_id)
      })

      // Find exact match
      for (const [conversationId, participants] of participantsByConversation.entries()) {
        if (participants.size !== sortedIds.length) continue

        let allMatch = true
        for (const participantId of sortedIds) {
          if (!participants.has(participantId)) {
            allMatch = false
            break
          }
        }

        if (allMatch) {
          return await Conversation.find(conversationId)
        }
      }

      return null
    } catch (error) {
      console.error('[CreateConversationCommand.findExistingGroupConversation] Error:', error)
      return null
    }
  }

  /**
   * Create new conversation using stored procedure
   */
  private async createNewConversation(
    creatorId: number,
    participantIds: number[],
    title?: string,
    organizationId?: number
  ): Promise<Conversation> {
    // Convert participant IDs to comma-separated string
    const participantIdsString = participantIds.join(',')

    // Call stored procedure
    const result = await db.rawQuery('CALL create_conversation(?, ?, ?)', [
      creatorId,
      organizationId || null,
      participantIdsString,
    ])

    // Get conversation ID from result
    const conversationId = result[0][0]?.id || result[0][0]?.LAST_INSERT_ID()

    if (!conversationId) {
      throw new Error('Failed to create conversation - no ID returned')
    }

    // If title provided, update it (stored procedure doesn't support title)
    if (title) {
      await db
        .from('conversations')
        .where('id', conversationId)
        .update({ title, updated_at: DateTime.now().toSQL() })
    }

    // Load and return conversation
    const conversation = await Conversation.find(conversationId)

    if (!conversation) {
      throw new Error('Failed to load created conversation')
    }

    return conversation
  }

  /**
   * Add message to conversation using stored procedure
   */
  private async addMessage(
    conversationId: number,
    senderId: number,
    message: string
  ): Promise<void> {
    await db.rawQuery('CALL send_message(?, ?, ?)', [conversationId, senderId, message])
  }

  /**
   * Invalidate conversation list cache for all participants
   */
  private async invalidateCache(participantIds: number[]): Promise<void> {
    try {
      const cacheKeys = participantIds.map((userId) => `user:${userId}:conversations:*`)

      for (const pattern of cacheKeys) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }
    } catch (error) {
      console.error('[CreateConversationCommand.invalidateCache] Error:', error)
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }
}
