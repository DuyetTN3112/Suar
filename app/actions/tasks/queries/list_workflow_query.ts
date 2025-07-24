import TaskWorkflowTransitionRepository from '#infra/tasks/repositories/task_workflow_transition_repository'
import type { DatabaseId } from '#types/database'
import type { TaskWorkflowTransitionRecord } from '#types/task_records'

/**
 * Query: List all workflow transitions for an organization.
 * Returns transitions with preloaded from/to status names.
 */
export default class ListWorkflowQuery {
  async execute(organizationId: DatabaseId): Promise<TaskWorkflowTransitionRecord[]> {
    return TaskWorkflowTransitionRepository.findByOrganization(organizationId)
  }
}
