import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetOrganizationShowPageQuery from '#modules/organizations/actions/queries/get_organization_show_page_query'

/**
 * GET /organizations/:id
 * Show organization detail
 */
export default class ShowOrganizationController {
  async handle(ctx: HttpContext) {
    const { params, inertia, auth } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const user = auth.user
    const organizationId = params.id as string

    const { organization, members, userRole } = await new GetOrganizationShowPageQuery(
      actionContextFromHttp(ctx)
    ).execute(organizationId, user.id)

    return await inertia.render('organizations/show', {
      organization,
      members,
      userRole,
    })
  }
}
