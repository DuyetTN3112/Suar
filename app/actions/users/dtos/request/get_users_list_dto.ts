import type { Query } from '../../interfaces.js'

import type { OrganizationUserStatus } from '#modules/organizations/constants/organization_constants'
import type { PaginationDTO } from '#types/action_dtos'
import type { DatabaseId } from '#types/database'

/**
 * GetUsersListDTO
 *
 * Data Transfer Object for querying users list with filters and pagination.
 * Used by GetUsersListQuery.
 */
export class GetUsersListDTO implements Query {
  constructor(
    public readonly pagination: PaginationDTO,
    public readonly organizationId: DatabaseId,
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
