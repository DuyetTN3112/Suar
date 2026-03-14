import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondCreatedMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { OrganizationWorkflowCommandFactory } from '#modules/organizations/workflow/actions/ports/inbound/organization_workflow_command_factory'
import { buildCurrentOrganizationWorkflowCreateTaskStatusDTO } from '#modules/organizations/workflow/controllers/mappers/request/current_task_status_request_mapper'
import { mapCurrentOrganizationTaskStatusMutationApiBody } from '#modules/organizations/workflow/controllers/mappers/response/current_task_status_response_mapper'

/**
 * CreateTaskStatusController
 *
 * Create custom task status
 *
 * POST /org/tasks/workflow
 */
@inject()
export default class CreateTaskStatusController {
  constructor(private readonly actions: OrganizationWorkflowCommandFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const organizationId = execCtx.organizationId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const dto = buildCurrentOrganizationWorkflowCreateTaskStatusDTO(request)

    const status = await this.actions.makeCreateTaskStatus(execCtx).execute(dto)

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
