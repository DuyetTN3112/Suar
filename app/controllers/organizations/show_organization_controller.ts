import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import GetOrganizationShowPageQuery from '#actions/organizations/queries/get_organization_show_page_query'

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

    const { organization, members, userRole } = await new GetOrganizationShowPageQuery(ctx).execute(
      organizationId,
      user.id
    )

    return await inertia.render('organizations/show', {
      organization,
      members,
      userRole,
    })
  }
}
