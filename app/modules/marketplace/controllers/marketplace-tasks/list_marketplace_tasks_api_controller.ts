import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildGetMarketplaceTasksDTO } from '../mappers/request/marketplace-tasks/marketplace_task_request_mapper.js'
import { mapMarketplaceTasksApiBody } from '../mappers/response/marketplace-tasks/marketplace_task_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'

/**
 * GET /api/marketplace/tasks and /api/v1/marketplace/tasks.
 */
@inject()
export default class ListMarketplaceTasksApiController {
  constructor(private readonly actions: MarketplaceActionFactory) {}

  async handle(ctx: HttpContext) {
    const execCtx = { ...actionContextFromHttp(ctx), organizationId: null }
    const dto = buildGetMarketplaceTasksDTO(ctx.request)
    const query = this.actions.makeGetMarketplaceTasksQuery(execCtx)
    const result = await query.executeAndWrap(dto).then((outcome) => outcome.getValue())

    return mapMarketplaceTasksApiBody(result)
  }
}
