import { privateCacheKeyDigest } from '#modules/cache/public_contracts/cache_contract'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/actions/dtos/common/members/organization_pagination'
import { toLastPage, toOffset } from '#modules/pagination/public_contracts/pagination_public_api'
/**
 * DTO for getting organization members list with filters and pagination
 *
 * Pattern: Paginated query with role filter (learned from Projects module)
 * v3: Role filter uses OrganizationRole enum strings
 *
 * @example
 * const dto = new GetOrganizationMembersDTO('org-uuid', 1, 20, OrganizationRole.MEMBER)
 */
export class GetOrganizationMembersDTO {
  constructor(
    public readonly organizationId: string,
    public readonly page = 1,
    public readonly limit: number = PAGINATION.DEFAULT_PER_PAGE,
    public readonly roleId?: string,
    public readonly search?: string,
    public readonly sortBy = 'joined_at',
    public readonly sortOrder: 'asc' | 'desc' = 'desc',
    public readonly statusFilter?: 'active' | 'pending' | 'inactive',
    public readonly include?: ('activity' | 'audit')[],
    public readonly joinDateStart?: string,
    public readonly joinDateEnd?: string
  ) {
    this.validate()
  }

  static fromFilters(
    organizationId: string,
    filters: {
      page?: number
      limit?: number
      role_id?: string
      search?: string
      sort_by?: string
      sort_order?: 'asc' | 'desc'
      status_filter?: 'active' | 'pending' | 'inactive'
      include?: ('activity' | 'audit')[]
      join_date_start?: string
      join_date_end?: string
    }
  ): GetOrganizationMembersDTO {
    return new GetOrganizationMembersDTO(
      organizationId,
      filters.page,
      filters.limit,
      filters.role_id,
      filters.search,
      filters.sort_by,
      filters.sort_order,
      filters.status_filter,
      filters.include,
      filters.join_date_start,
      filters.join_date_end
    )
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Organization ID validation (required)
    if (!this.organizationId) {
      throw new ValidationException('Organization ID is required')
    }

    // Page validation
    if (typeof this.page !== 'number' || this.page < 1) {
      throw new ValidationException('Page must be a positive number')
    }

    // Limit validation (1-100)
    if (typeof this.limit !== 'number' || this.limit < 1 || this.limit > PAGINATION.MAX_PER_PAGE) {
      throw new ValidationException('Limit must be between 1 and 100')
    }

    // Role filter validation (optional, must be valid OrganizationRole)
    if (this.roleId !== undefined) {
      const validRoles = Object.values(OrganizationRole) as string[]
      if (!validRoles.includes(this.roleId)) {
        throw new ValidationException(`Role must be one of: ${validRoles.join(', ')}`)
      }
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
    const validSortFields = ['joined_at', 'name', 'email', 'org_role']
    if (!validSortFields.includes(this.sortBy)) {
      throw new ValidationException(`Sort by must be one of: ${validSortFields.join(', ')}`)
    }

    // Sort order validation
    if (this.sortOrder !== 'asc') {
      // Sort order is always 'asc' or 'desc' due to type constraint
    }

    if (
      this.statusFilter !== undefined &&
      !['active', 'pending', 'inactive'].includes(this.statusFilter)
    ) {
      throw new ValidationException('statusFilter must be one of: active, pending, inactive')
    }

    if (this.include !== undefined) {
      const validIncludes = ['activity', 'audit']
      const invalidIncludes = this.include.filter((item) => !validIncludes.includes(item))
      if (invalidIncludes.length > 0) {
        throw new ValidationException(
          `include contains invalid values: ${invalidIncludes.join(', ')}`
        )
      }
    }
  }

  /**
   * Helper: Get offset for SQL query
   */
  getOffset(): number {
    return toOffset(this.page, this.limit)
  }

  /**
   * Helper: Check if role filter is active
   */
  hasRoleFilter(): boolean {
    return this.roleId !== undefined
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
   * Helper: Get role name for display
   */
  getRoleName(): string | null {
    if (!this.hasRoleFilter()) return null

    const roleNames: Record<string, string> = {
      [OrganizationRole.OWNER]: 'Owner',
      [OrganizationRole.ADMIN]: 'Admin',
      [OrganizationRole.MEMBER]: 'Member',
    }
    return roleNames[this.roleId ?? ''] ?? 'Unknown'
  }

  /**
   * Helper: Get cache key for Redis
   * Pattern: Cache key generation (learned from Projects module)
   */
  getCacheKey(): string {
    const parts = [
      'org:members',
      `org:${this.organizationId}`,
      `page:${String(this.page)}`,
      `limit:${String(this.limit)}`,
      `sort:${this.sortBy}:${this.sortOrder}`,
    ]

    if (this.hasRoleFilter()) {
      parts.push(`role:${String(this.roleId ?? 0)}`)
    }

    if (this.hasSearch()) {
      parts.push(`search-hash:${privateCacheKeyDigest(this.getNormalizedSearch() ?? '')}`)
    }

    if (this.statusFilter) {
      parts.push(`status:${this.statusFilter}`)
    }

    if (this.include && this.include.length > 0) {
      parts.push(`include:${this.include.join(',')}`)
    }

    if (this.joinDateStart) {
      parts.push(`jstart:${this.joinDateStart}`)
    }

    if (this.joinDateEnd) {
      parts.push(`jend:${this.joinDateEnd}`)
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
      org_role: 'organization_users.org_role',
    }

    return {
      column: columnMap[this.sortBy] ?? this.sortBy,
      direction: this.sortOrder,
    }
  }

  /**
   * Helper: Get pagination metadata
   * Pattern: Pagination response (learned from all modules)
   */
  getPaginationMetadata(total: number) {
    const totalPages = toLastPage(total, this.limit)

    return {
      page: this.page,
      limit: this.limit,
      total,
      totalPages,
      hasNextPage: this.page < totalPages,
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
