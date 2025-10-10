import type { HttpContext } from '@adonisjs/core/http'

import { marketplaceCompositionRoot } from '../bootstrap/marketplace_composition_root.js'

import { buildApplyMarketplaceTaskDTO } from './mappers/request/marketplace_application_request_mapper.js'
import { mapApplyMarketplaceTaskApiBody } from './mappers/response/marketplace_task_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'

/**
 * POST /api/v1/tasks/:taskId/apply - marketplace-owned apply endpoint.
 */
export default class ApplyMarketplaceTaskController {
  async handle(ctx: HttpContext) {
    const dto = await buildApplyMarketplaceTaskDTO(ctx.request, String(ctx.params['taskId']))
    const command = marketplaceCompositionRoot.makeApplyMarketplaceTaskCommand(
      actionContextFromHttp(ctx)
    )
    const application = await command.handle(dto)

    ctx.response.status(HttpStatus.CREATED).json(mapApplyMarketplaceTaskApiBody(application))
  }
}
