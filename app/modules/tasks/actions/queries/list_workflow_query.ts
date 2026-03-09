import type { TaskWorkflowQueryRepository } from '#modules/tasks/actions/ports/outbound/task_workflow_query_repository'
import type { TaskWorkflowTransitionRecord } from '#modules/tasks/types/task_records'

/**
 * Query: List all workflow transitions for an organization.
 * Returns transitions with preloaded from/to status names.
 */
export default class ListWorkflowQuery {
  constructor(private readonly repository: TaskWorkflowQueryRepository) {}

  async execute(organizationId: string): Promise<TaskWorkflowTransitionRecord[]> {
    return this.repository.findByOrganization(organizationId)
  }
}
