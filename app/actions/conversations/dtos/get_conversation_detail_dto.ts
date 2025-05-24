/**
 * DTO for retrieving conversation details
 *
 * Pattern: Single resource retrieval
 * Business rules:
 * - User must be participant in conversation
 * - Includes participants list
 * - Includes last message
 * - Includes unread count
 *
 * @example
 * const dto = new GetConversationDetailDTO(1)
 */
export class GetConversationDetailDTO {
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
