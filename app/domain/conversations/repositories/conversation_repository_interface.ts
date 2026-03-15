/**
 * IConversationRepository — Domain Repository Interface
 *
 * Defines the contract for conversation data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { ConversationEntity } from '../entities/conversation_entity.js'
import type { DatabaseId } from '#types/database'

export interface IConversationRepository {
  findById(id: DatabaseId): Promise<ConversationEntity | null>
  findByOrganization(organizationId: DatabaseId): Promise<ConversationEntity[]>
  findByParticipant(userId: DatabaseId): Promise<ConversationEntity[]>
  findNotDeletedOrFail(id: DatabaseId): Promise<ConversationEntity>
}
