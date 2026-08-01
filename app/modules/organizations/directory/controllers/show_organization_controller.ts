import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationPortfolioQueryFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_portfolio_query_factory'

/**
 * GET /organizations/:id
 * Show organization detail
 */
@inject()
export default class ShowOrganizationController {
  constructor(private readonly portfolioQueries: OrganizationPortfolioQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { params, inertia, auth } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const user = auth.user
    const organizationId = params['organizationId'] as string

    const {
      organization,
      members,
      membersPagination,
      userRole,
      organizationReviews,
      reverseReviewGovernance,
    } = await this.portfolioQueries
      .makeShowPage(actionContextFromHttp(ctx))
      .execute(organizationId, user.id, {
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
