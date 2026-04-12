import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateTaskDTO } from './mappers/request/task_request_mapper.js'
import {
  mapTaskEditPageProps,
  mapTaskUpdateApiBody,
} from './mappers/response/task_response_mapper.js'

import UpdateTaskCommand from '#actions/tasks/commands/update_task_command'
import GetTaskEditPageQuery from '#actions/tasks/queries/get_task_edit_page_query'
import { ErrorMessages, HttpStatus } from '#constants/error_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'

/**
 * GET /tasks/:id/edit — show form
 * PUT /tasks/:id — update task
 */
export default class EditTaskController {
  async showForm(ctx: HttpContext) {
    const { session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const { task, permissions, metadata } = await new GetTaskEditPageQuery(
      ExecutionContext.fromHttp(ctx)
    ).execute(ctx.params.id as string, organizationId)

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
    const command = new UpdateTaskCommand(ExecutionContext.fromHttp(ctx))
    const task = await command.execute(params.id as string, dto)

    session.flash('success', 'Nhiệm vụ đã được cập nhật thành công')

    if (request.header('X-Inertia')) {
      response.status(HttpStatus.OK).json(mapTaskUpdateApiBody(task))
      return
    }

    response.redirect().toRoute('tasks.show', { id: task.id })
    return
  }
}
