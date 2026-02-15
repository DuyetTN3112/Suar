import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Conversation from '#models/conversation'
import Message from '#models/message'
import { DateTime } from 'luxon'
import type { CreateConversationDTO } from '../dtos/create_conversation_dto.js'
import redis from '@adonisjs/redis/services/main'
import ConversationParticipant from '#models/conversation_participant'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

interface ParticipantData {
  conversation_id: DatabaseId
  user_id: DatabaseId
}

interface ConversationWithCount {
  id: DatabaseId
  participant_count: number
}

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
    const user = this.ctx.auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    // Get all participants including creator
    const allParticipantIds = dto.getAllParticipantIds(user.id)

    try {
      // For direct (1-1) conversations, check if exists
      if (dto.isDirect) {
        const otherUserId = dto.participantIds[0]
        if (otherUserId === undefined) {
          throw new BusinessLogicException('Participant ID is required for direct conversation')
        }
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
      loggerService.error('[CreateConversationCommand] Error:', error)
      throw error
    }
  }

  /**
   * Find existing direct (1-1) conversation between two users
   */
  private async findExistingDirectConversation(
    userId1: DatabaseId,
    userId2: DatabaseId
  ): Promise<Conversation | null> {
    try {
      // Find conversations with exactly 2 participants
      const rawResult: unknown = await db.rawQuery(
        `
        SELECT c.id, COUNT(cp.user_id) as participant_count
        FROM conversations c
        JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE c.title IS NULL AND c.deleted_at IS NULL
        GROUP BY c.id
        HAVING participant_count = 2
      `
      )
      const conversationsWithCount = (rawResult as [ConversationWithCount[], unknown])[0]

      if (conversationsWithCount.length === 0) {
        return null
      }

      const potentialIds = conversationsWithCount.map((row) => row.id)

      // Find conversations with both users
      const participantsRaw: unknown = await db.rawQuery(
        `
        SELECT conversation_id, user_id
        FROM conversation_participants
        WHERE conversation_id IN (${potentialIds.map(() => '?').join(',')})
          AND user_id IN (?, ?)
      `,
        [...potentialIds, userId1, userId2]
      )
      const participantsData = (participantsRaw as [ParticipantData[], unknown])[0]

      // Group by conversation
      const participantsByConversation = new Map<string, Set<string>>()
      for (const row of participantsData) {
        const convId = String(row.conversation_id)
        const uid = String(row.user_id)
        if (!participantsByConversation.has(convId)) {
          participantsByConversation.set(convId, new Set())
        }
        participantsByConversation.get(convId)?.add(uid)
      }

      // Find conversation with exactly these 2 users
      for (const [conversationId, participants] of participantsByConversation.entries()) {
        if (
          participants.has(String(userId1)) &&
          participants.has(String(userId2)) &&
          participants.size === 2
        ) {
          return await Conversation.find(conversationId)
        }
      }

      return null
    } catch (error) {
      loggerService.error(
        '[CreateConversationCommand.findExistingDirectConversation] Error:',
        error
      )
      return null
    }
  }

  /**
   * Find existing group conversation with exact same participants
   */
  private async findExistingGroupConversation(
    participantIds: DatabaseId[]
  ): Promise<Conversation | null> {
    try {
      const sortedIds = [...participantIds].map(String).sort()

      // Find conversations with exact participant count
      const rawResult: unknown = await db.rawQuery(
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
      const conversationsWithCount = (rawResult as [ConversationWithCount[], unknown])[0]

      if (conversationsWithCount.length === 0) {
        return null
      }

      const potentialIds = conversationsWithCount.map((row) => row.id)

      // Get all participants for these conversations
      const participantsRaw: unknown = await db.rawQuery(
        `
        SELECT conversation_id, user_id
        FROM conversation_participants
        WHERE conversation_id IN (${potentialIds.map(() => '?').join(',')})
      `,
        [...potentialIds]
      )
      const participantsData = (participantsRaw as [ParticipantData[], unknown])[0]

      // Group by conversation
      const participantsByConversation = new Map<string, Set<string>>()
      for (const row of participantsData) {
        const convId = String(row.conversation_id)
        const uid = String(row.user_id)
        if (!participantsByConversation.has(convId)) {
          participantsByConversation.set(convId, new Set())
        }
        participantsByConversation.get(convId)?.add(uid)
      }

      // Find exact match
      for (const [conversationId, participants] of participantsByConversation.entries()) {
        if (participants.size !== sortedIds.length) continue

        let allMatch = true
        for (const participantId of sortedIds) {
          if (!participants.has(String(participantId))) {
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
      loggerService.error('[CreateConversationCommand.findExistingGroupConversation] Error:', error)
      return null
    }
  }

  /**
   * Create new conversation using Lucid models + transaction
   * Replaces CALL create_conversation stored procedure.
   *
   * Business rules from stored procedure:
   * 1. Creator must be approved member of organization
   * 2. All participants must be approved members of organization
   * 3. Creator is auto-added as participant
   * 4. INSERT conversation → INSERT participants (atomic via transaction)
   */
  private async createNewConversation(
    creatorId: DatabaseId,
    participantIds: DatabaseId[],
    title?: string,
    organizationId?: DatabaseId
  ): Promise<Conversation> {
    // Validate creator is approved org member (matches stored procedure check)
    if (organizationId) {
      const creatorMembership = await db
        .from('organization_users')
        .where('user_id', creatorId)
        .where('organization_id', organizationId)
        .where('status', 'approved')
        .first()

      if (!creatorMembership) {
        throw new BusinessLogicException('Người tạo không thuộc tổ chức')
      }

      // Validate all participants are approved org members
      if (participantIds.length > 0) {
        const validMembers = await db
          .from('organization_users')
          .whereIn('user_id', participantIds)
          .where('organization_id', organizationId)
          .where('status', 'approved')
          .select('user_id')

        if (validMembers.length !== participantIds.length) {
          throw new BusinessLogicException('Một hoặc nhiều người tham gia không thuộc tổ chức')
        }
      }
    }

    // Use transaction for atomic creation (conversation + participants)
    const trx = await db.transaction()
    try {
      // Create conversation
      const conversation = await Conversation.create(
        {
          organization_id: organizationId ? String(organizationId) : null,
          title: title ?? null,
        },
        { client: trx }
      )

      // Add creator as participant
      await ConversationParticipant.create(
        {
          conversation_id: conversation.id,
          user_id: String(creatorId),
        },
        { client: trx }
      )

      // Add other participants (INSERT IGNORE equivalent — skip duplicates)
      if (participantIds.length > 0) {
        const uniqueParticipants = participantIds.filter((id) => String(id) !== String(creatorId))
        for (const participantId of uniqueParticipants) {
          await ConversationParticipant.create(
            {
              conversation_id: conversation.id,
              user_id: String(participantId),
            },
            { client: trx }
          )
        }
      }

      await trx.commit()
      return conversation
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Add message to conversation using Lucid model
   * Replaces CALL send_message stored procedure for initial message.
   * Note: Trigger `update_last_message_at` in MySQL will auto-update conversation.last_message_at
   */
  private async addMessage(
    conversationId: DatabaseId,
    senderId: DatabaseId,
    message: string
  ): Promise<void> {
    await Message.create({
      conversation_id: String(conversationId),
      sender_id: String(senderId),
      message: message,
    })
  }

  /**
   * Invalidate conversation list cache for all participants
   */
  private async invalidateCache(participantIds: DatabaseId[]): Promise<void> {
    try {
      const cacheKeys = participantIds.map((userId) => `user:${String(userId)}:conversations:*`)

      for (const pattern of cacheKeys) {
        const keys = await redis.keys(pattern)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }
    } catch (error) {
      loggerService.error('[CreateConversationCommand.invalidateCache] Error:', error)
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }
}
