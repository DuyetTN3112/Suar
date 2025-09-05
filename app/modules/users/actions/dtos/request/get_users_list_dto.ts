import type { Query } from '../../interfaces.js'

import type { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import type { UserPaginationDTO } from '#modules/users/application/dtos/common/user_action_dtos'

/**
 * GetUsersListDTO
 *
 * Data Transfer Object for querying users list with filters and pagination.
 * Used by GetUsersListQuery.
 */
export class GetUsersListDTO implements Query {
  constructor(
    public readonly pagination: UserPaginationDTO,
    public readonly organizationId: string,
    public readonly filters: UserFiltersDTO
  ) {}
}

/**
 * UserFiltersDTO
 *
 * Filters for user list queries.
 * v3: roleId is now a system_role string, statusId is now a status string.
 */
export class UserFiltersDTO {
  constructor(
    public readonly search?: string,
    public readonly roleId?: string,
    public readonly statusId?: string,
    public readonly excludeStatusId?: string,
    public readonly organizationUserStatus?: OrganizationUserStatus,
    public readonly excludeOrganizationMembers = false
  ) {}
}
