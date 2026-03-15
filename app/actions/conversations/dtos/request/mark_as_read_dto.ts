import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

/**
 * DTO for marking a conversation as read
 *
 * Pattern: Simple read status update
 * Business rules:
 * - User must be participant in conversation
 * - Marks all unread messages as read for this user
 * - Updates read_at timestamp
 *
 * @example
 * const dto = new MarkAsReadDTO(1)
 */
export class MarkAsReadDTO {
  constructor(public readonly conversationId: DatabaseId) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Conversation ID validation (required, UUIDv7 string)
    if (!this.conversationId || typeof this.conversationId !== 'string') {
      throw new ValidationException('Conversation ID is required')
    }
  }
}

/**
 * DTO for marking specific messages as read
 *
 * Pattern: Batch message read status update
 * Business rules:
 * - User must be participant in conversation
 * - Can mark multiple messages at once
 * - Updates read_at timestamp for each message
 *
 * @example
 * const dto = new MarkMessagesAsReadDTO(1, [10, 11, 12])
 */
export class MarkMessagesAsReadDTO {
  constructor(
    public readonly conversationId: DatabaseId,
    public readonly messageIds: DatabaseId[]
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Conversation ID validation (required, UUIDv7 string)
    if (!this.conversationId || typeof this.conversationId !== 'string') {
      throw new ValidationException('Conversation ID is required')
    }

    // Message IDs validation (required, non-empty array)
    if (!Array.isArray(this.messageIds)) {
      throw new ValidationException('Message IDs must be an array')
    }

    if (this.messageIds.length === 0) {
      throw new ValidationException('Must provide at least one message ID')
    }

    // Validate each message ID
    for (const messageId of this.messageIds) {
      if (Number(messageId) <= 0) {
        throw new ValidationException(`Invalid message ID: ${String(messageId)}`)
      }
    }

    // Check for duplicate message IDs
    const uniqueIds = new Set(this.messageIds)
    if (uniqueIds.size !== this.messageIds.length) {
      throw new ValidationException('Message IDs must be unique')
    }

    // Allow marking many messages at once (validation only)
  }

  /**
   * Get unique message IDs
   */
  get uniqueMessageIds(): DatabaseId[] {
    return Array.from(new Set(this.messageIds))
  }
}
