import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import GetOrganizationMembersQuery from '#actions/organizations/queries/get_organization_members_query'
import GetPendingRequestsQuery from '#actions/organizations/queries/get_pending_requests_query'
import GetOrganizationMetadataQuery from '#actions/organizations/queries/get_organization_metadata_query'
import GetOrganizationBasicInfoQuery from '#actions/organizations/queries/get_organization_basic_info_query'
import GetOrganizationShowDataQuery from '#actions/organizations/queries/get_organization_show_data_query'
import { GetOrganizationMembersDTO } from '#actions/organizations/dtos/request/get_organization_members_dto'
import loggerService from '#services/logger_service'

/**
 * GET /organizations/:id/members
 * Display organization members management page
 */
export default class ListMembersController {
  async handle(ctx: HttpContext) {
    const { params, inertia, auth } = ctx

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const organizationId = params.id as string

    try {
      const membersDTO = new GetOrganizationMembersDTO(organizationId, 1, 100, undefined, undefined)

      // Delegate all queries to Actions layer
      const execCtx = ExecutionContext.fromHttp(ctx)
      const [membersResult, pendingRequests, metadata, organization, showData] = await Promise.all([
        new GetOrganizationMembersQuery(execCtx).execute(membersDTO),
        new GetPendingRequestsQuery(execCtx).execute(organizationId),
        new GetOrganizationMetadataQuery(ctx).execute(),
        GetOrganizationBasicInfoQuery.execute(organizationId),
        new GetOrganizationShowDataQuery(ctx).execute(organizationId, user.id),
      ])

      return await inertia.render('organizations/members/index', {
        organization,
        members: membersResult.data,
        roles: metadata.roles,
        userRole: showData.userRole,
        pendingRequests,
      })
    } catch (error: unknown) {
      loggerService.error('[ListMembersController.handle] Error:', error)
      return inertia.render('organizations/members/index', {
        organization: null,
        members: [],
        roles: [],
        userRole: 0,
        pendingRequests: [],
      })
    }
  }
}
