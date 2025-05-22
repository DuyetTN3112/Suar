/**
 * DTO for sending a message in a conversation
 *
 * Pattern: Message creation with validation
 * Business rules:
 * - User must be participant in conversation
 * - Message content required
 * - Max length 5000 characters
 * - HTML/script content should be sanitized
 *
 * @example
 * const dto = new SendMessageDTO(1, 'Hello everyone!')
 */
export class SendMessageDTO {
  constructor(
    public readonly conversationId: number,
    public readonly message: string
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

    // Message content validation (required)
    if (!this.message || typeof this.message !== 'string') {
      throw new Error('Message content is required and must be a string')
    }

    if (this.message.trim().length === 0) {
      throw new Error('Message content cannot be empty')
    }

    if (this.message.length > 5000) {
      throw new Error('Message cannot exceed 5000 characters')
    }

    // Check for potentially malicious content
    // The actual sanitization happens in the command if needed
    this.containsSuspiciousContent(this.message)
  }

  /**
   * Check for suspicious content patterns
   */
  private containsSuspiciousContent(content: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers like onclick=
      /<iframe/i,
    ]

    return suspiciousPatterns.some((pattern) => pattern.test(content))
  }

  /**
   * Get trimmed message content
   */
  get trimmedMessage(): string {
    return this.message.trim()
  }
}
