import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import GetOrganizationMembersPageQuery from '#actions/organizations/queries/get_organization_members_page_query'
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
      const pageData = await new GetOrganizationMembersPageQuery(ExecutionContext.fromHttp(ctx)).execute(
        organizationId,
        user.id
      )

      return await inertia.render('organizations/members/index', pageData)
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
