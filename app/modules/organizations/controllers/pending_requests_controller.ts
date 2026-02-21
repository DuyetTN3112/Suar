import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetPendingRequestsPageQuery from '#modules/organizations/actions/queries/get_pending_requests_page_query'

/**
 * GET /organizations/:id/members/pending
 * Display pending join requests
 */
export default class PendingRequestsController {
  async handle(ctx: HttpContext) {
    const { params, inertia, response } = ctx

    const organizationId = params.id as string

    const pageData = await new GetPendingRequestsPageQuery(actionContextFromHttp(ctx)).execute(
      organizationId
    )

    if (!pageData.organization) {
      response.redirect().toRoute('organizations.index')
      return
    }

    return await inertia.render('organizations/members/pending_requests', pageData)
  }
}
