import { BaseQuery, PaginatedResult } from '../../shared/index.js'
import { GetUsersListDTO } from '../dtos/get_users_list_dto.js'
import User from '#models/user'

/**
 * GetUsersListQuery
 *
 * Retrieves a paginated list of users with optional filtering.
 * Supports:
 * - Pagination
 * - Organization filtering
 * - Role filtering
 * - Status filtering
 * - Search by name/email/username
 *
 * This is a Query (Read operation) that does NOT change system state.
 * Results can be cached for performance.
 *
 * @example
 * ```typescript
 * const dto = new GetUsersListDTO(
 *   new PaginationDTO(1, 10),
 *   organizationId,
 *   new UserFiltersDTO('john', 2, 1)
 * )
 * const result = await getUsersListQuery.handle(dto)
 * ```
 */
export default class GetUsersListQuery extends BaseQuery<GetUsersListDTO, PaginatedResult<User>> {
  /**
   * Main handler - executes the query with caching
   */
  async handle(dto: GetUsersListDTO): Promise<PaginatedResult<User>> {
    const cacheKey = this.buildCacheKey(dto)

    return await this.executeWithCache(cacheKey, 300, async () => {
      const query = this.buildQuery(dto)
      const result = await query.paginate(dto.pagination.page, dto.pagination.limit)

      return PaginatedResult.create(result.all(), result.total, dto.pagination)
    })
  }

  /**
   * Build cache key based on query parameters
   */
  private buildCacheKey(dto: GetUsersListDTO): string {
    return this.generateCacheKey('users:list', {
      page: dto.pagination.page,
      limit: dto.pagination.limit,
      orgId: dto.organizationId,
      search: dto.filters.search || '',
      roleId: dto.filters.roleId || 0,
      statusId: dto.filters.statusId || 0,
      excludeStatusId: dto.filters.excludeStatusId || 0,
      excludeOrgMembers: dto.filters.excludeOrganizationMembers ? 1 : 0,
    })
  }

  /**
   * Build the database query with all filters applied
   */
  private buildQuery(dto: GetUsersListDTO) {
    let query = User.query().preload('role').preload('status').whereNull('deleted_at')

    // Apply organization filter
    query = this.applyOrganizationFilter(query, dto)

    // Apply role filter
    if (dto.filters.roleId) {
      query = query.where('role_id', dto.filters.roleId)
    }

    // Apply status filters
    query = this.applyStatusFilters(query, dto.filters)

    // Apply search filter
    if (dto.filters.search) {
      query = this.applySearchFilter(query, dto.filters.search)
    }

    return query
  }

  /**
   * Apply organization-specific filters
   */
  private applyOrganizationFilter(query: unknown, dto: GetUsersListDTO) {
    if (dto.filters.excludeOrganizationMembers) {
      return query.whereDoesntHave('organization_users', (q: unknown) => {
        q.where('organization_id', dto.organizationId)
      })
    }

    return query
      .whereHas('organization_users', (q: unknown) => {
        q.where('organization_id', dto.organizationId)

        if (dto.filters.organizationUserStatus) {
          q.where('status', dto.filters.organizationUserStatus)
        }
      })
      .preload('organization_users', (q: unknown) => {
        q.where('organization_id', dto.organizationId)
        q.preload('role')
      })
  }

  /**
   * Apply status filters
   */
  private applyStatusFilters(query: unknown, filters: unknown) {
    if (filters.statusId) {
      query = query.where('status_id', filters.statusId)
    }

    if (filters.excludeStatusId) {
      query = query.whereNot('status_id', filters.excludeStatusId)
    }

    return query
  }

  /**
   * Apply search filter across multiple fields
   */
  private applySearchFilter(query: unknown, searchTerm: string) {
    return query.where((q: unknown) => {
      q.where('email', 'LIKE', `%${searchTerm}%`).orWhere('username', 'LIKE', `%${searchTerm}%`)
    })
  }
}
