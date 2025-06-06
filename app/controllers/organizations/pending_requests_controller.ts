import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetPendingRequestsQuery from '#actions/organizations/queries/get_pending_requests_query'
import GetOrganizationBasicInfoQuery from '#actions/organizations/queries/get_organization_basic_info_query'

/**
 * GET /organizations/:id/members/pending
 * Display pending join requests
 */
export default class PendingRequestsController {
  async handle(ctx: HttpContext) {
    const { params, inertia, response } = ctx

    const organizationId = params.id as string

    // Delegate all queries to Actions layer
    const [requests, organization] = await Promise.all([
      new GetPendingRequestsQuery(ExecutionContext.fromHttp(ctx)).execute(organizationId),
      GetOrganizationBasicInfoQuery.execute(organizationId),
    ])

    if (!organization) {
      response.redirect().toRoute('organizations.index')
      return
    }

    return await inertia.render('organizations/members/pending_requests', {
      organization,
      pendingRequests: requests,
    })
  }
}
