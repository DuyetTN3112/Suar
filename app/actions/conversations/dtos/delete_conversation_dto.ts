/**
 * DTO for soft-deleting a conversation
 *
 * Pattern: Soft delete for data retention
 * Business rules:
 * - Only participants can delete conversation
 * - Soft delete only (sets deleted_at timestamp)
 * - All messages remain in database
 * - Can be restored by clearing deleted_at
 *
 * @example
 * const dto = new DeleteConversationDTO(1)
 */
export class DeleteConversationDTO {
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
