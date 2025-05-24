/**
 * DTO for getting organizations list with filters and pagination
 *
 * Pattern: Pagination with filters (learned from Tasks/Projects modules)
 * Supports search, plan filter, pagination, and sorting
 *
 * @example
 * const dto = new GetOrganizationsListDTO(1, 20, 'Acme', 'premium')
 */
export class GetOrganizationsListDTO {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly search?: string,
    public readonly plan?: string,
    public readonly sortBy: string = 'created_at',
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
      throw new Error('Page must be a positive number')
    }

    // Limit validation (1-100)
    if (typeof this.limit !== 'number' || this.limit < 1 || this.limit > 100) {
      throw new Error('Limit must be between 1 and 100')
    }

    // Search validation (optional, max 100 characters)
    if (this.search !== undefined && this.search !== null) {
      if (typeof this.search !== 'string') {
        throw new Error('Search query must be a string')
      }

      if (this.search.trim().length > 100) {
        throw new Error('Search query cannot exceed 100 characters')
      }
    }

    // Plan validation (optional, must be valid plan)
    if (this.plan !== undefined && this.plan !== null) {
      if (typeof this.plan !== 'string') {
        throw new Error('Plan filter must be a string')
      }

      const validPlans = ['free', 'basic', 'premium', 'enterprise']
      if (!validPlans.includes(this.plan.toLowerCase())) {
        throw new Error(`Plan must be one of: ${validPlans.join(', ')}`)
      }
    }

    // Sort by validation
    const validSortFields = ['created_at', 'name', 'plan', 'updated_at']
    if (!validSortFields.includes(this.sortBy)) {
      throw new Error(`Sort by must be one of: ${validSortFields.join(', ')}`)
    }

    // Sort order validation
    if (this.sortOrder !== 'asc' && this.sortOrder !== 'desc') {
      throw new Error('Sort order must be either "asc" or "desc"')
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
    return this.search !== undefined && this.search !== null && this.search.trim().length > 0
  }

  /**
   * Helper: Get normalized search query
   */
  getNormalizedSearch(): string | null {
    if (!this.hasSearch()) return null
    return this.search!.trim()
  }

  /**
   * Helper: Check if plan filter is active
   */
  hasPlanFilter(): boolean {
    return this.plan !== undefined && this.plan !== null && this.plan.trim().length > 0
  }

  /**
   * Helper: Get normalized plan filter
   */
  getNormalizedPlan(): string | null {
    if (!this.hasPlanFilter()) return null
    return this.plan!.toLowerCase()
  }

  /**
   * Helper: Get cache key for Redis
   * Pattern: Cache key generation (learned from Projects module)
   */
  getCacheKey(userId: number): string {
    const parts = [
      'orgs:list',
      `user:${userId}`,
      `page:${this.page}`,
      `limit:${this.limit}`,
      `sort:${this.sortBy}:${this.sortOrder}`,
    ]

    if (this.hasSearch()) {
      parts.push(`search:${this.getNormalizedSearch()}`)
    }

    if (this.hasPlanFilter()) {
      parts.push(`plan:${this.getNormalizedPlan()}`)
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
