import TaskWorkflowTransition from '#models/task_workflow_transition'
import type { DatabaseId } from '#types/database'

/**
 * Query: List all workflow transitions for an organization.
 * Returns transitions with preloaded from/to status names.
 */
export default class ListWorkflowQuery {
  async execute(organizationId: DatabaseId): Promise<TaskWorkflowTransition[]> {
    return TaskWorkflowTransition.findByOrganization(organizationId)
  }
}
