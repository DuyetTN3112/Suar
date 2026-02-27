import TaskWorkflowTransitionRepository from '#modules/tasks/infra/repositories/task_workflow_transition_repository'
import type { TaskWorkflowTransitionRecord } from '#modules/tasks/types/task_records'

/**
 * Query: List all workflow transitions for an organization.
 * Returns transitions with preloaded from/to status names.
 */
export default class ListWorkflowQuery {
  async execute(organizationId: string): Promise<TaskWorkflowTransitionRecord[]> {
    return TaskWorkflowTransitionRepository.findByOrganization(organizationId)
  }
}
