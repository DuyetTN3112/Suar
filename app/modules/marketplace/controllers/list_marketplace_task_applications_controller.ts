import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildGetMarketplaceTaskApplicationsDTO } from './mappers/request/marketplace_application_request_mapper.js'
import { mapMarketplaceTaskApplicationsPageProps } from './mappers/response/marketplace_application_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'

/**
 * GET /tasks/:taskId/applications - marketplace-owned applicant review page.
 */
@inject()
export default class ListMarketplaceTaskApplicationsController {
  constructor(private readonly actions: MarketplaceActionFactory) {}

  async handle(ctx: HttpContext) {
    const dto = buildGetMarketplaceTaskApplicationsDTO(ctx.request, String(ctx.params['taskId']))
    const query = this.actions.makeGetMarketplaceTaskApplicationsQuery(
      actionContextFromHttp(ctx)
    )
    const result = await query.handle(dto)

    return ctx.inertia.render(
      'tasks/applications',
      mapMarketplaceTaskApplicationsPageProps(
        result,
        String(ctx.params['taskId']),
        dto.status,
        'organization'
      )
    )
  }
}
