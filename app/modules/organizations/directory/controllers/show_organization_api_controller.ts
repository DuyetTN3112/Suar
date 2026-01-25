import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapOrganizationDetailApiBody } from './mappers/response/organization_response_mapper.js'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { GetOrganizationDetailDTO } from '#modules/organizations/directory/actions/dtos/request/get_organization_detail_dto'
import { OrganizationPortfolioQueryFactory } from '#modules/organizations/directory/actions/ports/inbound/organization_portfolio_query_factory'

@inject()
export default class ShowOrganizationApiController {
  constructor(private readonly portfolioQueries: OrganizationPortfolioQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { auth, params } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const query = this.portfolioQueries.makeDetail(actionContextFromHttp(ctx))
    const result = await query.execute(
      new GetOrganizationDetailDTO(params['organizationId'] as string, true, true, true)
    )

    return mapOrganizationDetailApiBody(result)
  }
}
