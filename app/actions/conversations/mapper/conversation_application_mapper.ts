/**
 * ConversationApplicationMapper — Application Layer Mapper
 *
 * Maps between DTOs ↔ Domain Entities for the application layer.
 *
 * Flow:
 *   Inbound:  Request DTO → Domain Entity Props (partial)
 *   Outbound: Domain Entity → Response DTO
 */

import type { ConversationEntity } from '#domain/conversations/entities/conversation_entity'
import type { ConversationEntityProps } from '#domain/conversations/entities/conversation_entity'
import type { MessageEntity } from '#domain/conversations/entities/message_entity'
import type { CreateConversationDTO } from '../dtos/request/create_conversation_dto.js'
import type {
  ConversationDetailResponseDTO,
  ConversationListItemResponseDTO,
  MessageResponseDTO,
} from '../dtos/response/conversation_response_dtos.js'

export class ConversationApplicationMapper {
  /**
   * CreateConversationDTO → Partial<ConversationEntityProps>
   */
  static fromCreateDTO(dto: CreateConversationDTO): Partial<ConversationEntityProps> {
    return {
      title: dto.title ?? null,
      organizationId: dto.organizationId ?? null,
    }
  }

  /**
   * ConversationEntity → ConversationDetailResponseDTO
   */
  static toDetailResponse(entity: ConversationEntity): ConversationDetailResponseDTO {
    return {
      id: entity.id,
      title: entity.title,
      organizationId: entity.organizationId,
      taskId: entity.taskId,
      lastMessageId: entity.lastMessageId,
      lastMessageAt: entity.lastMessageAt?.toISOString() ?? null,
      deletedAt: entity.deletedAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }

  /**
   * ConversationEntity → ConversationListItemResponseDTO
   */
  static toListItemResponse(entity: ConversationEntity): ConversationListItemResponseDTO {
    return {
      id: entity.id,
      title: entity.title,
      organizationId: entity.organizationId,
      taskId: entity.taskId,
      lastMessageId: entity.lastMessageId,
      lastMessageAt: entity.lastMessageAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }

  /**
   * MessageEntity → MessageResponseDTO
   */
  static toMessageResponse(entity: MessageEntity): MessageResponseDTO {
    return {
      id: entity.id,
      conversationId: entity.conversationId,
      senderId: entity.senderId,
      message: entity.message,
      sendStatus: entity.sendStatus,
      isRecalled: entity.isRecalled,
      recalledAt: entity.recalledAt?.toISOString() ?? null,
      recallScope: entity.recallScope,
      readAt: entity.readAt?.toISOString() ?? null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }
}
