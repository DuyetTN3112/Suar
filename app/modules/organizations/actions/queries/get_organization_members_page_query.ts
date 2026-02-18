import { GetOrganizationMembersDTO } from '../dtos/request/get_organization_members_dto.js'

import GetOrganizationBasicInfoQuery from './get_organization_basic_info_query.js'
import GetOrganizationMembersQuery from './get_organization_members_query.js'
import GetOrganizationMetadataQuery from './get_organization_metadata_query.js'
import GetOrganizationShowDataQuery from './get_organization_show_data_query.js'
import GetPendingRequestsQuery from './get_pending_requests_query.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'



export interface OrganizationMembersPageResult {
  organization: { id: string; name: string } | null
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
  include?: ('activity' | 'audit')[]
  joinDateStart?: string
  joinDateEnd?: string
}

/**
 * Query: Get Organization Members Page Data
 *
 * Composite query that aggregates all data needed to render
 * the organization members management page.
 */
export default class GetOrganizationMembersPageQuery {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(
    organizationId: string,
    userId: string,
    filters?: OrganizationMembersPageFilters
  ): Promise<OrganizationMembersPageResult> {
    const currentUserId = userId
    if (!currentUserId) {
      throw new UnauthorizedException()
    }

    const membersDTO = GetOrganizationMembersDTO.fromFilters(organizationId, omitUndefined({
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 100,
      role_id: filters?.roleId,
      search: filters?.search,
      sort_by: 'joined_at',
      sort_order: 'desc' as const,
      status_filter: filters?.statusFilter,
      include: filters?.include,
      join_date_start: filters?.joinDateStart,
      join_date_end: filters?.joinDateEnd,
    }))

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
