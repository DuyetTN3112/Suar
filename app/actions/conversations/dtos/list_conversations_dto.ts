/**
 * DTO for listing user's conversations
 *
 * Pattern: Paginated list with search and filters
 * Business rules:
 * - Shows only conversations where user is participant
 * - Supports pagination (default: page 1, limit 15)
 * - Supports search by title or participant name
 * - Orders by updated_at DESC (most recent first)
 * - Includes unread count for each conversation
 * - Excludes deleted conversations
 *
 * @example
 * // Get first page with default settings
 * const dto = new ListConversationsDTO(1, 15)
 *
 * // Search conversations
 * const dto = new ListConversationsDTO(1, 15, 'project team')
 */
export class ListConversationsDTO {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 15,
    public readonly search?: string
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Page validation (must be positive)
    if (typeof this.page !== 'number' || this.page < 1) {
      throw new Error('Page must be a positive number starting from 1')
    }

    // Limit validation (must be between 1 and 50)
    if (typeof this.limit !== 'number' || this.limit < 1) {
      throw new Error('Limit must be at least 1')
    }

    if (this.limit > 50) {
      throw new Error('Limit cannot exceed 50 conversations per page')
    }

    // Search validation (optional, max length)
    if (this.search !== undefined && this.search !== null) {
      if (typeof this.search !== 'string') {
        throw new Error('Search query must be a string')
      }

      if (this.search.trim().length === 0) {
        // Empty search is same as no search
        // We can ignore this case
      }

      if (this.search.length > 255) {
        throw new Error('Search query cannot exceed 255 characters')
      }
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

  /**
   * Check if search is active
   */
  get hasSearch(): boolean {
    return Boolean(this.search && this.search.trim().length > 0)
  }

  /**
   * Get trimmed search query
   */
  get trimmedSearch(): string | undefined {
    return this.search?.trim()
  }
}
