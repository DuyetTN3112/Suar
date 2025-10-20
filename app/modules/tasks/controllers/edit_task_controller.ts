import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateTaskDTO } from './mappers/request/task_request_mapper.js'
import {
  mapTaskEditPageProps,
  mapTaskUpdateApiBody,
} from './mappers/response/task_response_mapper.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import {
  makeGetTaskEditPageQuery,
  makeUpdateTaskCommand,
} from '#modules/tasks/bootstrap/task_action_factory'

/**
 * GET /tasks/:taskId/edit — show form
 * PUT /tasks/:taskId — update task
 */
export default class EditTaskController {
  async showForm(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const { task, permissions, metadata } = await makeGetTaskEditPageQuery(
      actionContextFromHttp(ctx)
    ).execute(ctx.params['taskId'] as string, organizationId)

    return await ctx.inertia.render(
      'tasks/edit',
      mapTaskEditPageProps({ task, metadata, permissions })
    )
  }

  async handle(ctx: HttpContext) {
    const { params, request, response, session, auth } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const dto = await buildUpdateTaskDTO(request, auth.user.id)
    const command = makeUpdateTaskCommand(actionContextFromHttp(ctx))
    const task = await command.execute(params['taskId'] as string, dto)

    session.flash('success', 'Nhiệm vụ đã được cập nhật thành công')

    if (request.header('X-Inertia')) {
      response.status(HttpStatus.OK).json(mapTaskUpdateApiBody(task))
      return
    }

    response.redirect(`/tasks/${task.id}`)
    return
  }
}
