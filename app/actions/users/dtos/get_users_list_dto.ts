import { PaginationDTO, type Query } from '../../shared/index.js'

/**
 * GetUsersListDTO
 *
 * Data Transfer Object for querying users list with filters and pagination.
 * Used by GetUsersListQuery.
 */
export class GetUsersListDTO implements Query {
  constructor(
    public readonly pagination: PaginationDTO,
    public readonly organizationId: number,
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
    public readonly roleId?: number,
    public readonly statusId?: number,
    public readonly excludeStatusId?: number,
    public readonly organizationUserStatus?: 'pending' | 'approved' | 'rejected',
    public readonly excludeOrganizationMembers: boolean = false
  ) {}
}
