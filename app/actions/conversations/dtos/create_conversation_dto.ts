/**
 * DTO for creating a conversation
 *
 * Pattern: Flexible conversation creation (direct 1-1 or group)
 * Business rules:
 * - Must have at least one participant (excluding creator)
 * - Supports both direct (1-1) and group conversations
 * - Can include initial message
 * - Auto-includes creator as participant
 * - Checks for existing direct/group conversations
 *
 * @example
 * // Direct conversation
 * const dto = new CreateConversationDTO([2], 'Hello!', undefined, 1)
 *
 * // Group conversation
 * const dto = new CreateConversationDTO([2, 3, 4], 'Team chat', 'Project Group', 1)
 */
export class CreateConversationDTO {
  constructor(
    public readonly participantIds: number[],
    public readonly initialMessage?: string,
    public readonly title?: string,
    public readonly organizationId?: number
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Participant IDs validation (required, at least 1 participant)
    if (!this.participantIds || !Array.isArray(this.participantIds)) {
      throw new Error('Participant IDs must be an array')
    }

    if (this.participantIds.length === 0) {
      throw new Error('Must have at least one participant')
    }

    // Validate each participant ID
    for (const participantId of this.participantIds) {
      if (typeof participantId !== 'number' || participantId <= 0) {
        throw new Error(`Invalid participant ID: ${participantId}`)
      }
    }

    // Initial message validation (optional, max length)
    if (this.initialMessage !== undefined && this.initialMessage !== null) {
      if (typeof this.initialMessage !== 'string') {
        throw new Error('Initial message must be a string')
      }

      if (this.initialMessage.trim().length === 0) {
        throw new Error('Initial message cannot be empty if provided')
      }

      if (this.initialMessage.length > 5000) {
        throw new Error('Initial message cannot exceed 5000 characters')
      }
    }

    // Title validation (optional for 1-1, recommended for groups)
    if (this.title !== undefined && this.title !== null) {
      if (typeof this.title !== 'string') {
        throw new Error('Title must be a string')
      }

      if (this.title.trim().length === 0) {
        throw new Error('Title cannot be empty if provided')
      }

      if (this.title.length > 255) {
        throw new Error('Title cannot exceed 255 characters')
      }
    }

    // Recommend title for group conversations (3+ participants)
    if (this.participantIds.length >= 2 && !this.title) {
      // This is just a warning, not an error
      // Groups can exist without titles, but it's recommended
    }

    // Organization ID validation (optional)
    if (this.organizationId !== undefined && this.organizationId !== null) {
      if (typeof this.organizationId !== 'number' || this.organizationId <= 0) {
        throw new Error('Organization ID must be a positive number')
      }
    }

    // Check for duplicate participant IDs
    const uniqueIds = new Set(this.participantIds)
    if (uniqueIds.size !== this.participantIds.length) {
      throw new Error('Participant IDs must be unique')
    }
  }

  /**
   * Check if this is a direct (1-1) conversation
   */
  get isDirect(): boolean {
    return this.participantIds.length === 1 // Excluding creator
  }

  /**
   * Check if this is a group conversation
   */
  get isGroup(): boolean {
    return this.participantIds.length > 1
  }

  /**
   * Get all participant IDs including creator
   */
  getAllParticipantIds(creatorId: number): number[] {
    return [...new Set([...this.participantIds, creatorId])]
  }
}
