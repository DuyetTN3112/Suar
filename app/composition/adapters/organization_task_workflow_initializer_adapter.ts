import type { OrganizationTaskWorkflowInitializer } from '#modules/organizations/directory/actions/ports/outbound/organization_task_workflow_initializer'
import { seedDefaultTaskStatuses } from '#modules/tasks/actions/commands/seed_default_task_statuses'
import { LucidTaskLifecycleRepository } from '#modules/tasks/infra/adapters/lucid_task_lifecycle_repository'

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
