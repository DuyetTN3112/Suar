import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import Conversation from '#models/conversation'
import Message from '#models/message'
import { DateTime } from 'luxon'
import type { CreateConversationDTO } from '../dtos/create_conversation_dto.js'
import redis from '@adonisjs/redis/services/main'
import ConversationParticipant from '#models/conversation_participant'
import OrganizationUser from '#models/organization_user'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

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
  constructor(protected execCtx: ExecutionContext) {}

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
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Get all participants including creator
    const allParticipantIds = dto.getAllParticipantIds(userId)

    try {
      // For direct (1-1) conversations, check if exists
      if (dto.isDirect) {
        const otherUserId = dto.participantIds[0]
        if (otherUserId === undefined) {
          throw new BusinessLogicException('Participant ID is required for direct conversation')
        }
        const existing = await Conversation.findDirectBetween(userId, otherUserId)

        if (existing) {
          // Add initial message if provided
          if (dto.initialMessage) {
            await this.addMessage(existing.id, userId, dto.initialMessage)
            await existing.merge({ updated_at: DateTime.now() }).save()
          }

          return existing
        }
      }

      // For group conversations (3+ people), check if exists
      if (dto.isGroup) {
        const existing = await Conversation.findGroupWithParticipants(allParticipantIds)

        if (existing) {
          // Add initial message if provided
          if (dto.initialMessage) {
            await this.addMessage(existing.id, userId, dto.initialMessage)
            await existing.merge({ updated_at: DateTime.now() }).save()
          }

          return existing
        }
      }

      // Create new conversation using stored procedure
      const conversation = await this.createNewConversation(
        userId,
        dto.participantIds,
        dto.title,
        dto.organizationId
      )

      // Add initial message if provided
      if (dto.initialMessage) {
        await this.addMessage(conversation.id, userId, dto.initialMessage)
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
    // Validate org membership via Fat Model methods
    if (organizationId) {
      const creatorIsApproved = await OrganizationUser.isApprovedMember(creatorId, organizationId)
      if (!creatorIsApproved) {
        throw new BusinessLogicException('Người tạo không thuộc tổ chức')
      }

      if (participantIds.length > 0) {
        const allValid = await OrganizationUser.validateAllApprovedMembers(
          participantIds,
          organizationId
        )
        if (!allValid) {
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

      // Add all participants (including creator) via Fat Model batch method
      const allUserIds = [
        creatorId,
        ...participantIds.filter((id) => String(id) !== String(creatorId)),
      ]
      await ConversationParticipant.createBatch(conversation.id, allUserIds, trx)

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
