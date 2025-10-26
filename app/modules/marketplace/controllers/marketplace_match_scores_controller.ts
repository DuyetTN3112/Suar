import type { HttpContext } from '@adonisjs/core/http'

import { marketplaceCompositionRoot } from '../bootstrap/marketplace_composition_root.js'

import {
  mapMarketplaceApplicationMatchScoreApiBody,
  mapMarketplaceTaskApplicationsRankingApiBody,
} from './mappers/response/marketplace_application_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'

/**
 * Marketplace-owned applicant match score endpoints.
 */
export default class MarketplaceMatchScoresController {
  async show(ctx: HttpContext) {
    const query = marketplaceCompositionRoot.makeGetMarketplaceApplicationMatchScoreQuery(
      actionContextFromHttp(ctx)
    )
    const result = await query.handle({
      task_id: String(ctx.params['taskId']),
      application_id: String(ctx.params['applicationId']),
    })

    return mapMarketplaceApplicationMatchScoreApiBody(result)
  }

  async ranking(ctx: HttpContext) {
    const query = marketplaceCompositionRoot.makeGetMarketplaceTaskApplicationsRankingQuery(
      actionContextFromHttp(ctx)
    )
    const result = await query.handle({
      task_id: String(ctx.params['taskId']),
    })

    return mapMarketplaceTaskApplicationsRankingApiBody(result)
  }
}
