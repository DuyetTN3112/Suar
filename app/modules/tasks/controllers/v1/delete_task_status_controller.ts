import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteTaskStatusDTO } from '../mappers/request/task_status_request_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { makeDeleteTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'

export default class DeleteTaskStatusController {
  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildDeleteTaskStatusDTO(
      organizationId,
      ctx.params['taskStatusId'] as string
    )

    await makeDeleteTaskStatusCommand(actionContextFromHttp(ctx)).execute(dto)

    ctx.response.noContent()
  }
}
