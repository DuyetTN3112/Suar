/**
 * DTO for retrieving messages in a conversation
 *
 * Pattern: Paginated message list
 * Business rules:
 * - User must be participant in conversation
 * - Supports pagination (default: page 1, limit 50)
 * - Orders by created_at DESC (newest first)
 * - Excludes recalled messages (for non-senders)
 * - Excludes deleted messages (scope: self)
 *
 * @example
 * // Get first page with default limit
 * const dto = new GetConversationMessagesDTO(1, 1, 50)
 *
 * // Get page 2 with 20 messages per page
 * const dto = new GetConversationMessagesDTO(1, 2, 20)
 */
export class GetConversationMessagesDTO {
  constructor(
    public readonly conversationId: number,
    public readonly page: number = 1,
    public readonly limit: number = 50
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

    // Page validation (must be positive)
    if (typeof this.page !== 'number' || this.page < 1) {
      throw new Error('Page must be a positive number starting from 1')
    }

    // Limit validation (must be between 1 and 100)
    if (typeof this.limit !== 'number' || this.limit < 1) {
      throw new Error('Limit must be at least 1')
    }

    if (this.limit > 100) {
      throw new Error('Limit cannot exceed 100 messages per page')
    }
  }

  /**
   * Calculate offset for database query
   */
  get offset(): number {
    return (this.page - 1) * this.limit
  }

  /**
   * Check if this is the first page
   */
  get isFirstPage(): boolean {
    return this.page === 1
  }
}
