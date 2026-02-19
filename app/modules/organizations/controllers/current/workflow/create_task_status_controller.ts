import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { respondCreatedMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import CreateOrganizationTaskStatusCommand from '#modules/organizations/actions/current/workflow/commands/create_task_status_command'
import { buildCurrentOrganizationWorkflowCreateTaskStatusDTO } from '#modules/organizations/controllers/current/workflow/mappers/request/current_task_status_request_mapper'
import { mapCurrentOrganizationTaskStatusMutationApiBody } from '#modules/organizations/controllers/current/workflow/mappers/response/current_task_status_response_mapper'

/**
 * CreateTaskStatusController
 *
 * Create custom task status
 *
 * POST /org/tasks/workflow
 */
export default class CreateTaskStatusController {
  async handle(ctx: HttpContext) {
    const { request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildCurrentOrganizationWorkflowCreateTaskStatusDTO(request, organizationId)

    const status = await new CreateOrganizationTaskStatusCommand(execCtx).execute(dto)

    respondCreatedMutationSuccess(ctx, {
      apiBody: mapCurrentOrganizationTaskStatusMutationApiBody(status),
      redirect: {
        kind: 'route',
        to: 'org.tasks.workflow',
      },
      successMessage: 'Tạo trạng thái công việc thành công',
    })
  }
}
