/**
 * DTO for adding a participant to a conversation
 *
 * Pattern: Conversation membership management
 * Business rules:
 * - Only existing participants can add new members
 * - Cannot add duplicate participants
 * - Group conversations only (not direct 1-1 conversations)
 * - New participant gets access to future messages only
 *
 * @example
 * const dto = new AddParticipantDTO(1, 5)
 */
export class AddParticipantDTO {
  constructor(
    public readonly conversationId: number,
    public readonly userId: number
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

    // User ID validation (required)
    if (!this.userId || typeof this.userId !== 'number') {
      throw new Error('User ID is required and must be a number')
    }

    if (this.userId <= 0) {
      throw new Error('User ID must be a positive number')
    }
  }
}
