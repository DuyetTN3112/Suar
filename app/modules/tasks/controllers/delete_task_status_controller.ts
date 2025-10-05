import type { HttpContext } from '@adonisjs/core/http'

import { buildDeleteTaskStatusDTO } from './mappers/request/task_status_request_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { makeDeleteTaskStatusCommand } from '#modules/tasks/bootstrap/task_action_factory'

/**
 * DELETE /api/task-statuses/:taskStatusId
 * Soft-delete a task status definition.
 */
export default class DeleteTaskStatusController {
  async handle(ctx: HttpContext) {
    const { response, params } = ctx
    const organizationId = requireCurrentOrganizationId(ctx)

    const dto = buildDeleteTaskStatusDTO(organizationId, params['taskStatusId'] as string)

    const command = makeDeleteTaskStatusCommand(actionContextFromHttp(ctx))
    await command.execute(dto)

    response.noContent()
  }
}
