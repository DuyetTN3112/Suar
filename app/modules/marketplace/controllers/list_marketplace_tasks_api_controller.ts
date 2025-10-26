import type { HttpContext } from '@adonisjs/core/http'

import { marketplaceCompositionRoot } from '../bootstrap/marketplace_composition_root.js'

import { buildGetMarketplaceTasksDTO } from './mappers/request/marketplace_task_request_mapper.js'
import { mapMarketplaceTasksApiBody } from './mappers/response/marketplace_task_response_mapper.js'
import { normalizeMarketplaceTaskSortForActor } from './support/marketplace_task_sort_policy.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'

/**
 * GET /api/marketplace/tasks and /api/v1/marketplace/tasks.
 */
export default class ListMarketplaceTasksApiController {
  async handle(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const dto = await normalizeMarketplaceTaskSortForActor(
      buildGetMarketplaceTasksDTO(ctx.request),
      execCtx
    )
    const query = marketplaceCompositionRoot.makeGetMarketplaceTasksQuery(execCtx)
    const result = await query.handle(dto)

    return mapMarketplaceTasksApiBody(result)
  }
}
