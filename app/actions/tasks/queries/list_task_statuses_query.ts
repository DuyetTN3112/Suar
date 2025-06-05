import TaskStatus from '#models/task_status'
import type { DatabaseId } from '#types/database'

/**
 * Query: List all active task statuses for an organization.
 */
export default class ListTaskStatusesQuery {
  async execute(organizationId: DatabaseId): Promise<TaskStatus[]> {
    return TaskStatus.findByOrganization(organizationId)
  }
}
