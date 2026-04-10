import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import CreateTaskCommand from '#actions/tasks/commands/create_task_command'
import GetTaskCreatePageQuery from '#actions/tasks/queries/get_task_create_page_query'
import { buildCreateTaskDTO } from './mappers/request/task_request_mapper.js'
import { mapTaskCreateApiBody } from './mappers/response/task_response_mapper.js'

/**
 * GET /tasks/create — show form
 * POST /tasks — store new task
 */
export default class CreateTaskController {
  async showForm(ctx: HttpContext) {
    const organizationId = ctx.session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const selectedProjectId = ctx.request.input('project_id') as string | undefined
    const { metadata } = await new GetTaskCreatePageQuery(ExecutionContext.fromHttp(ctx)).execute({
      organizationId,
      selectedProjectId,
    })
    return await ctx.inertia.render('tasks/create', { metadata })
  }

  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = await buildCreateTaskDTO(request, organizationId)
    const task = await new CreateTaskCommand(ExecutionContext.fromHttp(ctx)).execute(dto)

    // SPA/API callers expect JSON to update UI immediately without full-page redirect.
    if (request.accepts(['application/json'])) {
      response.status(201).json(mapTaskCreateApiBody(task))
      return
    }

    session.flash('success', 'Nhiệm vụ đã được tạo thành công')
    response.redirect().toRoute('tasks.show', { id: task.id })
  }
}
