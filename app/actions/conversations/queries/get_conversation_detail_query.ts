import type { ExecutionContext } from '#types/execution_context'
import ConversationRepository from '#repositories/conversation_repository'
import Conversation from '#models/conversation'
import MessageRepository from '#repositories/message_repository'
import redis from '@adonisjs/redis/services/main'
import type { GetConversationDetailDTO } from '../dtos/get_conversation_detail_dto.js'
import loggerService from '#services/logger_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import NotFoundException from '#exceptions/not_found_exception'

/**
 * Query: Lấy chi tiết conversation bao gồm:
 * - Conversation info
 * - Participants (users)
 * - Unread messages count
 * - Last message
 *
 * Features:
 * - Redis caching (5 min)
 * - Verify user is participant
 * - Preload relationships
 */
export default class GetConversationDetailQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: GetConversationDetailDTO): Promise<Conversation> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const { conversationId } = dto

    try {
      // Try cache first
      const cacheKey = `conversation:${String(conversationId)}:detail:user:${String(userId)}`
      const cached = await redis.get(cacheKey)

      if (cached) {
        return JSON.parse(cached) as Conversation
      }

      // Query conversation with participant check → delegate to Model
      const conversation = await ConversationRepository.findWithParticipant(conversationId, userId)

      if (!conversation) {
        throw NotFoundException.resource('Cuộc trò chuyện')
      }

      // Preload participants
      await conversation.load('participants')

      // Count unread messages → delegate to Model
      const unreadCount = await MessageRepository.countUnreadInConversation(conversationId, userId)

      // Get last message → delegate to Model
      const lastMessage = await MessageRepository.getLastMessageInConversation(conversationId, userId)

      // Attach to conversation object for easy access
      // @ts-expect-error - Adding virtual properties
      conversation.unreadCount = unreadCount
      // @ts-expect-error - Adding virtual properties
      conversation.lastMessage = lastMessage

      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(conversation))

      return conversation
    } catch (error) {
      loggerService.error('[GetConversationDetailQuery] Error:', error)
      throw error
    }
  }
}
