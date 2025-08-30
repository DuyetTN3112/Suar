import type { HttpContext } from '@adonisjs/core/http'

import CreateOrganizationTaskStatusCommand from '#actions/organizations/current/workflow/commands/create_task_status_command'
import { ErrorMessages } from '#constants/error_constants'
import { buildCurrentOrganizationWorkflowCreateTaskStatusDTO } from '#controllers/organizations/current/workflow/mappers/request/current_task_status_request_mapper'
import { mapCurrentOrganizationTaskStatusMutationApiBody } from '#controllers/organizations/current/workflow/mappers/response/current_task_status_response_mapper'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ExecutionContext } from '#types/execution_context'

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

    const dto = buildCurrentOrganizationWorkflowCreateTaskStatusDTO(request, organizationId)

    const status = await new CreateOrganizationTaskStatusCommand(execCtx).execute(dto)

    if (request.accepts(['html', 'json']) === 'json') {
      response.status(201).json(mapCurrentOrganizationTaskStatusMutationApiBody(status))
      return
    }

    session.flash('success', 'Tạo trạng thái công việc thành công')
    response.redirect().toRoute('org.workflow.statuses')
  }
}
