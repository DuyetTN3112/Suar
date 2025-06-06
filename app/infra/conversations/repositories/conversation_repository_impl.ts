/**
 * ConversationRepositoryImpl — Infrastructure Repository Implementation
 *
 * Implements IConversationRepository from domain layer.
 * Uses Lucid ORM (AdonisJS) for database access.
 * Maps ORM entities to domain entities using ConversationInfraMapper.
 */

import type { IConversationRepository } from '#domain/conversations/repositories/conversation_repository_interface'
import type { ConversationEntity } from '#domain/conversations/entities/conversation_entity'
import { ConversationInfraMapper } from '../mapper/conversation_infra_mapper.js'
import Conversation from '#models/conversation'
import type { DatabaseId } from '#types/database'
import NotFoundException from '#exceptions/not_found_exception'

export class ConversationRepositoryImpl implements IConversationRepository {
  async findById(id: DatabaseId): Promise<ConversationEntity | null> {
    const model = await Conversation.find(id)
    return model ? ConversationInfraMapper.toDomain(model) : null
  }

  async findByOrganization(organizationId: DatabaseId): Promise<ConversationEntity[]> {
    const models = await Conversation.query()
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .orderBy('updated_at', 'desc')
    return models.map((m) => ConversationInfraMapper.toDomain(m))
  }

  async findByParticipant(userId: DatabaseId): Promise<ConversationEntity[]> {
    const models = await Conversation.query()
      .join(
        'conversation_participants',
        'conversations.id',
        'conversation_participants.conversation_id'
      )
      .where('conversation_participants.user_id', userId)
      .whereNull('conversations.deleted_at')
      .orderBy('conversations.updated_at', 'desc')
    return models.map((m) => ConversationInfraMapper.toDomain(m))
  }

  async findNotDeletedOrFail(id: DatabaseId): Promise<ConversationEntity> {
    const model = await Conversation.query().where('id', id).whereNull('deleted_at').first()

    if (!model) {
      throw NotFoundException.conversation(id)
    }
    return ConversationInfraMapper.toDomain(model)
  }
}
