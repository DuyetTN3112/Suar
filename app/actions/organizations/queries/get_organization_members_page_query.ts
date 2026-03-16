import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
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

/**
 * Query: Get Organization Members Page Data
 *
 * Composite query that aggregates all data needed to render
 * the organization members management page.
 */
export default class GetOrganizationMembersPageQuery {
  constructor(protected ctx: HttpContext) {}

  async execute(
    organizationId: DatabaseId,
    userId: DatabaseId
  ): Promise<OrganizationMembersPageResult> {
    const currentUserId = userId
    if (!currentUserId) {
      throw new UnauthorizedException()
    }

    const execCtx = ExecutionContext.fromHttp(this.ctx)
    const membersDTO = new GetOrganizationMembersDTO(organizationId, 1, 100, undefined, undefined)

    const [membersResult, pendingRequests, metadata, organization, showData] = await Promise.all([
      new GetOrganizationMembersQuery(execCtx).execute(membersDTO),
      new GetPendingRequestsQuery(execCtx).execute(organizationId),
      new GetOrganizationMetadataQuery(this.ctx).execute(),
      GetOrganizationBasicInfoQuery.execute(organizationId),
      new GetOrganizationShowDataQuery(this.ctx).execute(organizationId, userId),
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
