import type { OrganizationActionContext } from '#modules/organizations/workflow/actions/action_context'
import CreateOrganizationTaskStatusCommand from '#modules/organizations/workflow/actions/command/create_task_status_command'
import { OrganizationWorkflowCommandFactory } from '#modules/organizations/workflow/actions/ports/inbound/organization_workflow_command_factory'
import { OrganizationWorkflowQueryFactory } from '#modules/organizations/workflow/actions/ports/inbound/organization_workflow_query_factory'
import type { OrganizationTaskStatusCreator } from '#modules/organizations/workflow/actions/ports/outbound/organization_task_status_creator'
import type { OrganizationTaskStatusReader } from '#modules/organizations/workflow/actions/ports/outbound/organization_task_status_reader'
import ListTaskStatusesQuery from '#modules/organizations/workflow/actions/query/list_task_statuses_query'

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
