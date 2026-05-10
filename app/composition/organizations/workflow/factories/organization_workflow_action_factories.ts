import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import CreateOrganizationTaskStatusCommand from '#modules/organizations/actions/commands/workflow/create_task_status_command'
import { OrganizationWorkflowCommandFactory } from '#modules/organizations/actions/ports/inbound/workflow/organization_workflow_command_factory'
import { OrganizationWorkflowQueryFactory } from '#modules/organizations/actions/ports/inbound/workflow/organization_workflow_query_factory'
import type { OrganizationTaskStatusCreator } from '#modules/organizations/actions/ports/outbound/workflow/organization_task_status_creator'
import type { OrganizationTaskStatusReader } from '#modules/organizations/actions/ports/outbound/workflow/organization_task_status_reader'
import ListTaskStatusesQuery from '#modules/organizations/actions/queries/workflow/list_task_statuses_query'

export class ComposedOrganizationWorkflowCommandFactory extends OrganizationWorkflowCommandFactory {
  constructor(private readonly taskStatuses: OrganizationTaskStatusCreator) {
    super()
  }

  makeCreateTaskStatus(
    context: OrganizationActionContext
  ): CreateOrganizationTaskStatusCommand {
    return new CreateOrganizationTaskStatusCommand(context, this.taskStatuses)
  }
}

export class ComposedOrganizationWorkflowQueryFactory extends OrganizationWorkflowQueryFactory {
  constructor(private readonly taskStatuses: OrganizationTaskStatusReader) {
    super()
  }

  makeListTaskStatuses(context: OrganizationActionContext): ListTaskStatusesQuery {
    return new ListTaskStatusesQuery(context, this.taskStatuses)
  }
}
