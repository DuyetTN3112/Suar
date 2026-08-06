import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildUpdateTaskStatusDTO } from '../mappers/request/task-reading/task_request_mapper.js'
import { mapTaskStatusApiBody } from '../mappers/response/task-reading/task_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'

/**
 * PATCH /tasks/:taskId/status
 * Update task status
 */
@inject()
export default class UpdateTaskStatusController {
  constructor(private readonly statusCommands: TaskStatusWorkflowCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const dto = buildUpdateTaskStatusDTO(request, params['taskId'] as string)
    const task = await this.statusCommands
      .makeUpdateStatus(actionContextFromHttp(ctx))
      .executeAndWrap(dto)
      .then((outcome) => outcome.getValue())

    response
      .status(HttpStatus.OK)
      .json(mapTaskStatusApiBody(task))
  }
}
