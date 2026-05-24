import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildApplyMarketplaceTaskDTO } from '../mappers/request/marketplace-application/marketplace_application_request_mapper.js'
import { mapApplyMarketplaceTaskApiBody } from '../mappers/response/marketplace-tasks/marketplace_task_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'

/**
 * POST /api/v1/tasks/:taskId/apply - marketplace-owned apply endpoint.
 */
@inject()
export default class ApplyMarketplaceTaskController {
  constructor(private readonly actions: MarketplaceActionFactory) {}

  async handle(ctx: HttpContext) {
    const dto = await buildApplyMarketplaceTaskDTO(ctx.request, String(ctx.params['taskId']))
    const command = this.actions.makeApplyMarketplaceTaskCommand(
      actionContextFromHttp(ctx)
    )
    const application = await command.handle(dto).then((outcome) => outcome.getValue())

    ctx.response.status(HttpStatus.CREATED).json(mapApplyMarketplaceTaskApiBody(application))
  }
}
