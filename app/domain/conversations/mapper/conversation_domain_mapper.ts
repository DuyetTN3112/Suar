/**
 * ConversationDomainMapper — Domain Layer Mapper
 *
 * Mapper thuần trong domain layer — KHÔNG import bất kỳ thứ gì từ
 * database, ORM hay framework.
 *
 * Chức năng:
 * - Tạo entity từ plain object (props)
 * - Export entity ra plain object
 *
 * Lưu ý: Việc map từ ORM Model → Domain Entity nằm ở INFRA layer,
 * KHÔNG phải ở đây.
 */

import { ConversationEntity } from '../entities/conversation_entity.js'
import type { ConversationEntityProps } from '../entities/conversation_entity.js'
import { MessageEntity } from '../entities/message_entity.js'
import type { MessageEntityProps } from '../entities/message_entity.js'

export class ConversationDomainMapper {
  /**
   * Plain object (props) → ConversationEntity
   */
  static toEntity(props: ConversationEntityProps): ConversationEntity {
    return new ConversationEntity(props)
  }

  /**
   * ConversationEntity → Plain object (props)
   */
  static toProps(entity: ConversationEntity): ConversationEntityProps {
    return {
      id: entity.id,
      title: entity.title,
      organizationId: entity.organizationId,
      taskId: entity.taskId,
      lastMessageId: entity.lastMessageId,
      lastMessageAt: entity.lastMessageAt,
      deletedAt: entity.deletedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }

  /**
   * Plain object (props) → MessageEntity
   */
  static messageToEntity(props: MessageEntityProps): MessageEntity {
    return new MessageEntity(props)
  }

  /**
   * MessageEntity → Plain object (props)
   */
  static messageToProps(entity: MessageEntity): MessageEntityProps {
    return {
      id: entity.id,
      conversationId: entity.conversationId,
      senderId: entity.senderId,
      message: entity.message,
      sendStatus: entity.sendStatus,
      isRecalled: entity.isRecalled,
      recalledAt: entity.recalledAt,
      recallScope: entity.recallScope,
      readAt: entity.readAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    }
  }
}
