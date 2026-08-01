import { BaseQuery } from '../base_query.js'
import type { GetUsersListDTO } from '../dtos/request/get_users_list_dto.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { UserPaginatedResult } from '#modules/users/actions/dtos/common/user_action_dtos'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserOrganizationMembershipReaderWriter } from '#modules/users/actions/ports/outbound/user_external_dependencies'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type { UserRecord } from '#modules/users/types/user_records'

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
 * Full serialized user records are intentionally not cached. A future list
 * cache must use an explicit data-minimized projection.
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
export default class GetUsersListQuery extends BaseQuery<
  GetUsersListDTO,
  UserPaginatedResult<UserRecord>
> {
  constructor(
    execCtx: UserActionContext,
    private readonly organizationMembership: UserOrganizationMembershipReaderWriter,
    private readonly users: UserAccountRepository
  ) {
    super(execCtx)
  }

  /**
   * Main handler - executes an authoritative database read
   */
  async handle(dto: GetUsersListDTO): Promise<UserPaginatedResult<UserRecord>> {
    const organizationMemberUserIds =
      await this.organizationMembership.listMemberUserIds(
        dto.organizationId,
        dto.filters.excludeOrganizationMembers ? undefined : dto.filters.organizationUserStatus
      )

    const result = await this.users.paginate(
      omitUndefined({
        page: dto.pagination.page,
        limit: dto.pagination.limit,
        search: dto.filters.search,
        roleId: dto.filters.roleId,
        statusId: dto.filters.statusId,
        excludeStatusId: dto.filters.excludeStatusId,
        includeUserIds: dto.filters.excludeOrganizationMembers
          ? undefined
          : organizationMemberUserIds,
        excludeUserIds: dto.filters.excludeOrganizationMembers
          ? organizationMemberUserIds
          : undefined,
      })
    )

    return UserPaginatedResult.create(result.items, result.total, dto.pagination)
  }
}
