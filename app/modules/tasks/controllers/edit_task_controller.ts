import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateTaskDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskUpdateApiBody } from './mappers/response/task_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'
import { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'

/**
 * GET /tasks/:taskId/edit — compatibility redirect to the Project task card room
 * PUT /tasks/:taskId — update task
 */
@inject()
export default class EditTaskController {
  constructor(
    private readonly lifecycleCommands: TaskLifecycleCommandFactory,
    private readonly detailQueries: TaskDetailQueryFactory
  ) {}

  async showForm(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const { task } = await this.detailQueries
      .makeEditPage(actionContextFromHttp(ctx))
      .execute(ctx.params['taskId'] as string, organizationId)
    const projectId = task['project_id']

    if (typeof projectId !== 'string' || projectId.length === 0) {
      return ctx.response.redirect('/projects')
    }

    return ctx.response.redirect(
      `/projects/${encodeURIComponent(projectId)}/tasks?task_id=${encodeURIComponent(task.id)}`
    )
  }

  async handle(ctx: HttpContext) {
    const { params, request, response, session, auth } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const dto = await buildUpdateTaskDTO(request, auth.user.id)
    const command = this.lifecycleCommands.makeUpdate(actionContextFromHttp(ctx))
    const task = await command.execute(params['taskId'] as string, dto)

    session.flash('success', 'Nhiệm vụ đã được cập nhật thành công')

    if (request.header('X-Inertia')) {
      response.status(HttpStatus.OK).json(mapTaskUpdateApiBody(task))
      return
    }

    if (!task.project_id) {
      response.redirect('/projects')
      return
    }

    response.redirect(
      `/projects/${encodeURIComponent(task.project_id)}/tasks?task_id=${encodeURIComponent(task.id)}`
    )
    return
  }
}
