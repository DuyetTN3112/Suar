import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  mapMarketplaceApplicationMatchScoreApiBody,
  mapMarketplaceTaskApplicationsRankingApiBody,
} from '../mappers/response/marketplace-application/marketplace_application_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'
import { buildMarketplaceMatchScoreRouteRequest, buildMarketplaceTaskRouteRequest } from '#modules/marketplace/controllers/mappers/request/marketplace-application/marketplace_route_request_mapper'

/**
 * Marketplace-owned applicant match score endpoints.
 */
@inject()
export default class MarketplaceMatchScoresController {
  constructor(private readonly actions: MarketplaceActionFactory) {}

  async show(ctx: HttpContext) {
    const query = this.actions.makeGetMarketplaceApplicationMatchScoreQuery(
      actionContextFromHttp(ctx)
    )
    const result = await query
      .handle(buildMarketplaceMatchScoreRouteRequest(ctx.params))
      .then((outcome) => outcome.getValue())

    return mapMarketplaceApplicationMatchScoreApiBody(result)
  }

  async ranking(ctx: HttpContext) {
    const query = this.actions.makeGetMarketplaceTaskApplicationsRankingQuery(
      actionContextFromHttp(ctx)
    )
    const result = await query
      .handle(buildMarketplaceTaskRouteRequest(ctx.params))
      .then((outcome) => outcome.getValue())

    return mapMarketplaceTaskApplicationsRankingApiBody(result)
  }
}
