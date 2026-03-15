/**
 * ConversationInfraMapper — Infrastructure Layer Mapper
 *
 * Maps between ORM Entity (Lucid Model) ↔ Domain Entity.
 *
 * Flow:
 *   Read:  ORM Entity → Domain Entity
 *   Write: Domain Entity → ORM Entity (partial, for create/update)
 */

import { ConversationEntity } from '#domain/conversations/entities/conversation_entity'
import type { ConversationEntityProps } from '#domain/conversations/entities/conversation_entity'
import type Conversation from '#models/conversation'

export class ConversationInfraMapper {
  /**
   * ORM Entity (Lucid Model) → Domain Entity
   */
  static toDomain(model: Conversation): ConversationEntity {
    const props: ConversationEntityProps = {
      id: model.id,
      title: model.title,
      organizationId: model.organization_id,
      taskId: model.task_id,
      lastMessageId: model.last_message_id,
      lastMessageAt: model.last_message_at?.toJSDate() ?? null,
      deletedAt: model.deleted_at?.toJSDate() ?? null,
      createdAt: model.created_at.toJSDate(),
      updatedAt: model.updated_at.toJSDate(),
    }
    return new ConversationEntity(props)
  }

  /**
   * Domain Entity → ORM Entity fields (partial, for create/update)
   * Returns a plain object that can be used with Model.create() or model.merge()
   */
  static toOrm(entity: Partial<ConversationEntityProps>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    if (entity.title !== undefined) result.title = entity.title
    if (entity.organizationId !== undefined) result.organization_id = entity.organizationId
    if (entity.taskId !== undefined) result.task_id = entity.taskId
    if (entity.lastMessageId !== undefined) result.last_message_id = entity.lastMessageId
    if (entity.lastMessageAt !== undefined) result.last_message_at = entity.lastMessageAt
    if (entity.deletedAt !== undefined) result.deleted_at = entity.deletedAt

    return result
  }
}
