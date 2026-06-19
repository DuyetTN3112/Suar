import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationPortfolioQueryFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_portfolio_query_factory'
import { buildShowOrganizationPageRequest } from '#modules/organizations/controllers/mappers/request/directory/organization_directory_read_request_mapper'

/**
 * GET /organizations/:id
 * Show organization detail
 */
@inject()
export default class ShowOrganizationController {
  constructor(private readonly portfolioQueries: OrganizationPortfolioQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { params, inertia, auth, request } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const user = auth.user
    const pageRequest = buildShowOrganizationPageRequest(params, request)

    const {
      organization,
      members,
      membersPagination,
      userRole,
      organizationReviews,
      reverseReviewGovernance,
    } = await this.portfolioQueries
      .makeShowPage(actionContextFromHttp(ctx))
      .executeAndWrap(pageRequest.organizationId, user.id, {
        page: pageRequest.page,
        perPage: pageRequest.perPage,
      })
      .then((outcome) => outcome.getValue())

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
