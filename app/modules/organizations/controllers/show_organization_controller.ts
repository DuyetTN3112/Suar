import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
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
    const organizationId = params['organizationId'] as string

    const { organization, members, membersPagination, userRole, organizationReviews, reverseReviewGovernance } = await new GetOrganizationShowPageQuery(
      actionContextFromHttp(ctx)
    ).execute(organizationId, user.id, {
      page: ctx.request.input('page'),
      perPage:
        (ctx.request.input('perPage') as unknown) ??
        (ctx.request.input('per_page') as unknown) ??
        (ctx.request.input('limit') as unknown),
    })

    return await inertia.render('organizations/show', {
      organization,
      members,
      membersPagination,
      userRole,
      organizationReviews,
      reverseReviewGovernance,
    })
  }
}
