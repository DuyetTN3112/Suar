import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import CreateTaskStatusCommand from '#actions/tasks/commands/create_task_status_command'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ErrorMessages } from '#constants/error_constants'
import { buildOrganizationWorkflowCreateTaskStatusDTO } from '#controllers/tasks/mapper/request/task_status_request_mapper'
import { mapTaskStatusMutationApiBody } from '#controllers/tasks/mapper/response/task_status_response_mapper'

/**
 * CreateTaskStatusController
 *
 * Create custom task status
 *
 * POST /org/workflow/statuses
 */
export default class CreateTaskStatusController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildOrganizationWorkflowCreateTaskStatusDTO(request, organizationId)

    const status = await new CreateTaskStatusCommand(execCtx).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.status(201).json(mapTaskStatusMutationApiBody(status))
      return
    }

    session.flash('success', 'Tạo trạng thái công việc thành công')
    response.redirect().toRoute('org.workflow.statuses')
  }
}
