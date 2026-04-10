import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import GetOrganizationMembersQuery from './get_organization_members_query.js'
import GetPendingRequestsQuery from './get_pending_requests_query.js'
import GetOrganizationMetadataQuery from './get_organization_metadata_query.js'
import GetOrganizationBasicInfoQuery from './get_organization_basic_info_query.js'
import GetOrganizationShowDataQuery from './get_organization_show_data_query.js'
import { GetOrganizationMembersDTO } from '../dtos/request/get_organization_members_dto.js'

export interface OrganizationMembersPageResult {
  organization: { id: DatabaseId; name: string } | null
  members: unknown[]
  roles: unknown[]
  userRole: string
  pendingRequests: unknown[]
}

export interface OrganizationMembersPageFilters {
  page?: number
  limit?: number
  roleId?: string
  search?: string
  statusFilter?: 'active' | 'pending' | 'inactive'
  include?: Array<'activity' | 'audit'>
}

/**
 * Query: Get Organization Members Page Data
 *
 * Composite query that aggregates all data needed to render
 * the organization members management page.
 */
export default class GetOrganizationMembersPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(
    organizationId: DatabaseId,
    userId: DatabaseId,
    filters?: OrganizationMembersPageFilters
  ): Promise<OrganizationMembersPageResult> {
    const currentUserId = userId
    if (!currentUserId) {
      throw new UnauthorizedException()
    }

    const membersDTO = GetOrganizationMembersDTO.fromFilters(organizationId, {
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 100,
      role_id: filters?.roleId,
      search: filters?.search,
      sort_by: 'joined_at',
      sort_order: 'desc',
      status_filter: filters?.statusFilter,
      include: filters?.include,
    })

    const [membersResult, pendingRequests, metadata, organization, showData] = await Promise.all([
      new GetOrganizationMembersQuery(this.execCtx).execute(membersDTO),
      new GetPendingRequestsQuery(this.execCtx).execute(organizationId),
      new GetOrganizationMetadataQuery().execute(),
      GetOrganizationBasicInfoQuery.execute(organizationId),
      new GetOrganizationShowDataQuery().execute(organizationId, userId),
    ])

    return {
      organization,
      members: membersResult.data,
      roles: metadata.roles,
      userRole: showData.userRole,
      pendingRequests,
    }
  }
}
