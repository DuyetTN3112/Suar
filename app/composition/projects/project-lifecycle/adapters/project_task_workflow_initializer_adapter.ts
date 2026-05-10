import type { ProjectTaskWorkflowInitializer } from '#modules/projects/actions/ports/outbound/project_task_workflow_initializer'
import { seedDefaultTaskStatuses } from '#modules/tasks/actions/commands/task-status/seed_default_task_statuses'
import { LucidTaskLifecycleRepository } from '#modules/tasks/infra/adapters/task-authoring/lucid_task_lifecycle_repository'

export class ProjectTaskWorkflowInitializerAdapter implements ProjectTaskWorkflowInitializer {
  private readonly tasks = new LucidTaskLifecycleRepository()

  async seedDefaultStatusesForProject(
    organizationId: string,
    projectId: string,
    transaction: Parameters<ProjectTaskWorkflowInitializer['seedDefaultStatusesForProject']>[2]
  ): Promise<void> {
    await seedDefaultTaskStatuses(organizationId, transaction, this.tasks, projectId)
  }
}
