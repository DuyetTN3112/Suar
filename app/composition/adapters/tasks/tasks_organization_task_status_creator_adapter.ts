import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationTaskStatusCreateInput } from '#modules/organizations/actions/dtos/request/workflow/organization_task_status_create_input'
import type { OrganizationTaskStatusResult } from '#modules/organizations/actions/dtos/response/workflow/organization_task_status_result'
import { OrganizationTaskStatusCreator } from '#modules/organizations/actions/ports/outbound/workflow/organization_task_status_creator'
import type { TaskStatusDefinitionCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_definition_command_factory'
import { CreateTaskStatusDTO } from '#modules/tasks/public_contracts/task_status_dtos'

export class TasksOrganizationTaskStatusCreatorAdapter extends OrganizationTaskStatusCreator {
  constructor(private readonly commands: TaskStatusDefinitionCommandFactory) {
    super()
  }

  create(
    input: OrganizationTaskStatusCreateInput,
    context: OrganizationActionContext
  ): Promise<OrganizationTaskStatusResult> {
    if (!context.organizationId) {
      throw new Error('Task status creation requires an organization context')
    }

    const dto = CreateTaskStatusDTO.fromValidatedPayload(input, context.organizationId)
    return this.commands.makeCreate(context).execute(dto)
  }
}
