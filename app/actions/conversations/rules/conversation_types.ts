/**
 * Conversation Types — Plain data interfaces for conversation domain rules.
 *
 * 100% pure, no framework dependencies.
 * Used as input to conversation permission policies and state rules.
 */

import type { DatabaseId } from '#types/database'

/**
 * Context for sending a message in a conversation.
 */
export interface SendMessageContext {
  actorId: DatabaseId
  /** Whether the actor is a participant in the conversation */
  isParticipant: boolean
  /** Whether the actor is an approved member of the conversation's organization */
  isOrgMember: boolean
  /** Whether the conversation has an organization_id (null = freelancer conversation) */
  hasOrganization: boolean
}

/**
 * Context for recalling a message.
 */
export interface RecallMessageContext {
  actorId: DatabaseId
  /** ID of the message sender */
  messageSenderId: DatabaseId
  /** Whether the message has already been recalled */
  isAlreadyRecalled: boolean
  /** Recall scope: 'self' or 'all' */
  recallScope: string
}

/**
 * Context for adding a participant to a conversation.
 */
export interface AddParticipantContext {
  actorId: DatabaseId
  /** User to be added */
  targetUserId: DatabaseId
  /** Whether the actor is a participant in the conversation */
  isActorParticipant: boolean
  /** Whether the target user is already a participant */
  isTargetAlreadyParticipant: boolean
  /** Current participant count */
  participantCount: number
  /** Whether the conversation has a title (group indicator) */
  hasTitle: boolean
}

/**
 * Context for deleting a conversation.
 */
export interface DeleteConversationContext {
  actorId: DatabaseId
  /** Whether the actor is a participant in the conversation */
  isParticipant: boolean
}
