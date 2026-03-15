/**
 * Conversation Response DTOs — Application Layer
 *
 * Data Transfer Objects for API responses.
 * Pure TypeScript, no framework dependencies.
 */

export interface ConversationDetailResponseDTO {
  id: string
  title: string | null
  organizationId: string | null
  taskId: string | null
  lastMessageId: string | null
  lastMessageAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ConversationListItemResponseDTO {
  id: string
  title: string | null
  organizationId: string | null
  taskId: string | null
  lastMessageId: string | null
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MessageResponseDTO {
  id: string
  conversationId: string
  senderId: string
  message: string
  sendStatus: string
  isRecalled: boolean
  recalledAt: string | null
  recallScope: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}
