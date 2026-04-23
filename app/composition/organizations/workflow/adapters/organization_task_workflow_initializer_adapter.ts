import type { OrganizationTaskWorkflowInitializer } from '#modules/organizations/actions/ports/outbound/directory/organization_task_workflow_initializer'
import { seedDefaultTaskStatuses } from '#modules/tasks/actions/commands/task-status/seed_default_task_statuses'
import { LucidTaskLifecycleRepository } from '#modules/tasks/infra/adapters/task-authoring/lucid_task_lifecycle_repository'

export class OrganizationTaskWorkflowInitializerAdapter
  implements OrganizationTaskWorkflowInitializer
{
  private readonly tasks = new LucidTaskLifecycleRepository()

  async seedDefaultStatusesForOrganization(
    ...args: Parameters<OrganizationTaskWorkflowInitializer['seedDefaultStatusesForOrganization']>
  ): Promise<void> {
    await seedDefaultTaskStatuses(
      args[0],
      args[1],
      this.tasks
    )
  }
}
