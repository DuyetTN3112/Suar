import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type CreateOrganizationTaskStatusCommand from '#modules/organizations/actions/commands/workflow/create_task_status_command'

/**
 * Inbound construction contract for organization workflow mutations.
 */
export abstract class OrganizationWorkflowCommandFactory {
  abstract makeCreateTaskStatus(
    context: OrganizationActionContext
  ): CreateOrganizationTaskStatusCommand
}
