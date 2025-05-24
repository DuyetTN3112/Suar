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
  constructor(public readonly conversationId: number) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Conversation ID validation (required)
    if (!this.conversationId || typeof this.conversationId !== 'number') {
      throw new Error('Conversation ID is required and must be a number')
    }

    if (this.conversationId <= 0) {
      throw new Error('Conversation ID must be a positive number')
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
    public readonly conversationId: number,
    public readonly messageIds: number[]
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Conversation ID validation (required)
    if (!this.conversationId || typeof this.conversationId !== 'number') {
      throw new Error('Conversation ID is required and must be a number')
    }

    if (this.conversationId <= 0) {
      throw new Error('Conversation ID must be a positive number')
    }

    // Message IDs validation (required, non-empty array)
    if (!this.messageIds || !Array.isArray(this.messageIds)) {
      throw new Error('Message IDs must be an array')
    }

    if (this.messageIds.length === 0) {
      throw new Error('Must provide at least one message ID')
    }

    // Validate each message ID
    for (const messageId of this.messageIds) {
      if (typeof messageId !== 'number' || messageId <= 0) {
        throw new Error(`Invalid message ID: ${messageId}`)
      }
    }

    // Check for duplicate message IDs
    const uniqueIds = new Set(this.messageIds)
    if (uniqueIds.size !== this.messageIds.length) {
      throw new Error('Message IDs must be unique')
    }

    // Allow marking many messages at once (validation only)
  }

  /**
   * Get unique message IDs
   */
  get uniqueMessageIds(): number[] {
    return Array.from(new Set(this.messageIds))
  }
}
