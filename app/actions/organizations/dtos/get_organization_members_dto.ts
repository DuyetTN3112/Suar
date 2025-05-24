/**
 * DTO for getting organization members list with filters and pagination
 *
 * Pattern: Paginated query with role filter (learned from Projects module)
 * Supports filtering by role and pagination
 *
 * @example
 * const dto = new GetOrganizationMembersDTO(1, 1, 20, 4) // Get Members only
 */
export class GetOrganizationMembersDTO {
  constructor(
    public readonly organizationId: number,
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly roleId?: number,
    public readonly search?: string,
    public readonly sortBy: string = 'joined_at',
    public readonly sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Organization ID validation (required)
    if (!this.organizationId || typeof this.organizationId !== 'number') {
      throw new Error('Organization ID is required')
    }

    if (this.organizationId <= 0) {
      throw new Error('Organization ID must be a positive number')
    }

    // Page validation
    if (typeof this.page !== 'number' || this.page < 1) {
      throw new Error('Page must be a positive number')
    }

    // Limit validation (1-100)
    if (typeof this.limit !== 'number' || this.limit < 1 || this.limit > 100) {
      throw new Error('Limit must be between 1 and 100')
    }

    // Role ID validation (optional, must be valid role)
    if (this.roleId !== undefined && this.roleId !== null) {
      if (typeof this.roleId !== 'number') {
        throw new Error('Role ID must be a number')
      }

      const validRoles = [1, 2, 3, 4, 5]
      if (!validRoles.includes(this.roleId)) {
        throw new Error(`Role ID must be one of: ${validRoles.join(', ')}`)
      }
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

    // Sort by validation
    const validSortFields = ['joined_at', 'name', 'email', 'role_id']
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
   */
  getOffset(): number {
    return (this.page - 1) * this.limit
  }

  /**
   * Helper: Check if role filter is active
   */
  hasRoleFilter(): boolean {
    return this.roleId !== undefined && this.roleId !== null
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
   * Helper: Get role name for display
   */
  getRoleName(): string | null {
    if (!this.hasRoleFilter()) return null

    const roleNames: Record<number, string> = {
      1: 'Owner',
      2: 'Admin',
      3: 'Manager',
      4: 'Member',
      5: 'Viewer',
    }
    return roleNames[this.roleId!] || 'Unknown'
  }

  /**
   * Helper: Get cache key for Redis
   * Pattern: Cache key generation (learned from Projects module)
   */
  getCacheKey(): string {
    const parts = [
      'org:members',
      `org:${this.organizationId}`,
      `page:${this.page}`,
      `limit:${this.limit}`,
      `sort:${this.sortBy}:${this.sortOrder}`,
    ]

    if (this.hasRoleFilter()) {
      parts.push(`role:${this.roleId}`)
    }

    if (this.hasSearch()) {
      parts.push(`search:${this.getNormalizedSearch()}`)
    }

    return parts.join(':')
  }

  /**
   * Helper: Get SQL ORDER BY clause
   */
  getOrderByClause(): { column: string; direction: 'asc' | 'desc' } {
    // Map DTO field names to actual database column names
    const columnMap: Record<string, string> = {
      joined_at: 'organization_users.created_at',
      name: 'users.name',
      email: 'users.email',
      role_id: 'organization_users.role_id',
    }

    return {
      column: columnMap[this.sortBy] || this.sortBy,
      direction: this.sortOrder,
    }
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

  /**
   * Helper: Get cache TTL (3 minutes)
   */
  getCacheTTL(): number {
    return 180
  }
}
