import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

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
    public readonly conversationId: DatabaseId,
    public readonly userId: DatabaseId
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Conversation ID validation (required)
    if (!this.conversationId || typeof this.conversationId !== 'number') {
      throw new ValidationException('Conversation ID is required and must be a number')
    }

    if (this.conversationId <= 0) {
      throw new ValidationException('Conversation ID must be a positive number')
    }

    // User ID validation (required)
    if (!this.userId || typeof this.userId !== 'number') {
      throw new ValidationException('User ID is required and must be a number')
    }

    if (this.userId <= 0) {
      throw new ValidationException('User ID must be a positive number')
    }
  }
}
