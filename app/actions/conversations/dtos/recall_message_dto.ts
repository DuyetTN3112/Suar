/**
 * DTO for recalling a message
 *
 * Pattern: Message recall with scope control
 * Business rules:
 * - Only sender can recall message
 * - Two scopes: 'all' (everyone) or 'self' (only sender)
 * - Scope 'all': Changes message content to "Tin nhắn này đã bị thu hồi" and sets recall flags
 * - Scope 'self': Sets recall flags with scope 'self' (message hidden only for sender)
 * - Cannot recall already recalled messages
 *
 * @example
 * // Recall for everyone
 * const dto = new RecallMessageDTO(123, 'all')
 *
 * // Recall for self only
 * const dto = new RecallMessageDTO(123, 'self')
 */
export class RecallMessageDTO {
  constructor(
    public readonly messageId: number,
    public readonly scope: 'all' | 'self'
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Message ID validation (required)
    if (!this.messageId || typeof this.messageId !== 'number') {
      throw new Error('Message ID is required and must be a number')
    }

    if (this.messageId <= 0) {
      throw new Error('Message ID must be a positive number')
    }

    // Scope validation (required, must be 'all' or 'self')
    if (!this.scope) {
      throw new Error('Recall scope is required')
    }

    if (typeof this.scope !== 'string') {
      throw new Error('Recall scope must be a string')
    }

    const validScopes = ['all', 'self']
    if (!validScopes.includes(this.scope)) {
      throw new Error(`Invalid recall scope. Must be one of: ${validScopes.join(', ')}`)
    }
  }

  /**
   * Check if recall is for everyone
   */
  get isRecallForEveryone(): boolean {
    return this.scope === 'all'
  }

  /**
   * Check if recall is for self only
   */
  get isRecallForSelf(): boolean {
    return this.scope === 'self'
  }

  /**
   * Get the replacement message content for 'all' scope
   */
  get replacementMessage(): string {
    return 'Tin nhắn này đã bị thu hồi.'
  }
}
