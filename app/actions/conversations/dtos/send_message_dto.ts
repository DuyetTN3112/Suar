import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

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
    public readonly conversationId: DatabaseId,
    public readonly message: string
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Conversation ID validation (required, UUIDv7 string)
    if (!this.conversationId || typeof this.conversationId !== 'string') {
      throw new ValidationException('Conversation ID is required and must be a string')
    }

    // Message content validation (required)
    if (!this.message || typeof this.message !== 'string') {
      throw new ValidationException('Message content is required and must be a string')
    }

    if (this.message.trim().length === 0) {
      throw new ValidationException('Message content cannot be empty')
    }

    if (this.message.length > 5000) {
      throw new ValidationException('Message cannot exceed 5000 characters')
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
