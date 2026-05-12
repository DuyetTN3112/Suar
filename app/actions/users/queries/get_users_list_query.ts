import { inject } from '@adonisjs/core'

import { BaseQuery } from '../base_query.js'
import type { GetUsersListDTO } from '../dtos/request/get_users_list_dto.js'

import * as userModelQueries from '#infra/users/repositories/read/model_queries'
import { PaginatedResult } from '#types/action_dtos'
import type { UserRecord } from '#types/user_records'

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
@inject()
export default class GetUsersListQuery extends BaseQuery<
  GetUsersListDTO,
  PaginatedResult<UserRecord>
> {
  /**
   * Main handler - executes the query with caching
   */
  async handle(dto: GetUsersListDTO): Promise<PaginatedResult<UserRecord>> {
    const cacheKey = this.buildCacheKey(dto)

    return await this.executeWithCache(cacheKey, 300, async () => {
      const result = await userModelQueries.paginateUsersList({
        page: dto.pagination.page,
        limit: dto.pagination.limit,
        organizationId: dto.organizationId,
        search: dto.filters.search,
        roleId: dto.filters.roleId,
        statusId: dto.filters.statusId,
        excludeStatusId: dto.filters.excludeStatusId,
        excludeOrganizationMembers: dto.filters.excludeOrganizationMembers,
        organizationUserStatus: dto.filters.organizationUserStatus,
      })

      const users = result.all().map((user) => user.serialize() as UserRecord)
      return PaginatedResult.create(users, result.total, dto.pagination)
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
      search: dto.filters.search ?? '',
      roleId: dto.filters.roleId ?? 0,
      statusId: dto.filters.statusId ?? 0,
      excludeStatusId: dto.filters.excludeStatusId ?? 0,
      excludeOrgMembers: dto.filters.excludeOrganizationMembers ? 1 : 0,
    })
  }
}
