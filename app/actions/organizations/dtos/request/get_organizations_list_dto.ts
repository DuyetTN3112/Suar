import { PAGINATION } from '#constants/common_constants'
import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

/**
 * DTO for getting organizations list with filters and pagination
 *
 * Pattern: Pagination with filters (learned from Tasks/Projects modules)
 * Supports search, pagination, and sorting
 *
 * @example
 * const dto = new GetOrganizationsListDTO(1, 20, 'Acme')
 */
export class GetOrganizationsListDTO {
  constructor(
    public readonly page = 1,
    public readonly limit: number = PAGINATION.DEFAULT_PER_PAGE,
    public readonly search?: string,
    public readonly sortBy = 'created_at',
    public readonly sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Page validation
    if (typeof this.page !== 'number' || this.page < 1) {
      throw new ValidationException('Page must be a positive number')
    }

    // Limit validation (1-100)
    if (typeof this.limit !== 'number' || this.limit < 1 || this.limit > PAGINATION.MAX_PER_PAGE) {
      throw new ValidationException('Limit must be between 1 and 100')
    }

    // Search validation (optional, max 100 characters)
    if (this.search !== undefined) {
      if (typeof this.search !== 'string') {
        throw new ValidationException('Search query must be a string')
      }

      if (this.search.trim().length > 100) {
        throw new ValidationException('Search query cannot exceed 100 characters')
      }
    }

    // Sort by validation
    const validSortFields = ['created_at', 'name', 'updated_at']
    if (!validSortFields.includes(this.sortBy)) {
      throw new ValidationException(`Sort by must be one of: ${validSortFields.join(', ')}`)
    }

    // Sort order validation
    if (this.sortOrder !== 'asc') {
      // Sort order is always 'asc' or 'desc' due to type constraint
    }
  }

  /**
   * Helper: Get offset for SQL query
   * Pattern: Pagination helper (learned from all modules)
   */
  getOffset(): number {
    return (this.page - 1) * this.limit
  }

  /**
   * Helper: Check if search is active
   */
  hasSearch(): boolean {
    return this.search !== undefined && this.search.trim().length > 0
  }

  /**
   * Helper: Get normalized search query
   */
  getNormalizedSearch(): string | null {
    if (!this.hasSearch()) return null
    return this.search?.trim() ?? null
  }

  /**
   * Helper: Get cache key for Redis
   * Pattern: Cache key generation (learned from Projects module)
   */
  getCacheKey(userId: DatabaseId): string {
    const parts = [
      'orgs:list',
      `user:${userId}`,
      `page:${String(this.page)}`,
      `limit:${String(this.limit)}`,
      `sort:${this.sortBy}:${this.sortOrder}`,
    ]

    if (this.hasSearch()) {
      parts.push(`search:${this.getNormalizedSearch() ?? ''}`)
    }

    return parts.join(':')
  }

  /**
   * Helper: Get SQL ORDER BY clause
   */
  getOrderByClause(): { column: string; direction: 'asc' | 'desc' } {
    return {
      column: this.sortBy,
      direction: this.sortOrder,
    }
  }

  /**
   * Helper: Check if this is first page
   */
  isFirstPage(): boolean {
    return this.page === 1
  }

  /**
   * Helper: Get pagination metadata
   * Pattern: Pagination response (learned from all modules)
   */
  getPaginationMetadata(total: number) {
    return {
      page: this.page,
      limit: this.limit,
      total,
      totalPages: Math.ceil(total / this.limit),
      hasNextPage: this.page < Math.ceil(total / this.limit),
      hasPrevPage: this.page > 1,
    }
  }
}
