import type { HttpContext } from '@adonisjs/core/http'

import GetPendingRequestsPageQuery from '#actions/organizations/queries/get_pending_requests_page_query'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /organizations/:id/members/pending
 * Display pending join requests
 */
export default class PendingRequestsController {
  async handle(ctx: HttpContext) {
    const { params, inertia, response } = ctx

    const organizationId = params.id as string

    const pageData = await new GetPendingRequestsPageQuery(ExecutionContext.fromHttp(ctx)).execute(
      organizationId
    )

    if (!pageData.organization) {
      response.redirect().toRoute('organizations.index')
      return
    }

    return await inertia.render('organizations/members/pending_requests', pageData)
  }
}
