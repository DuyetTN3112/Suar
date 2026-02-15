import type { PaginationDTO, Query } from '../../shared/index.js'
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
 * Filters for user list queries
 */
export class UserFiltersDTO {
  constructor(
    public readonly search?: string,
    public readonly roleId?: DatabaseId,
    public readonly statusId?: DatabaseId,
    public readonly excludeStatusId?: DatabaseId,
    public readonly organizationUserStatus?: 'pending' | 'approved' | 'rejected',
    public readonly excludeOrganizationMembers: boolean = false
  ) {}
}
