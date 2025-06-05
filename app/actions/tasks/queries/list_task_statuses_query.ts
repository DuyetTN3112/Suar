import type TaskStatus from '#models/task_status'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import type { DatabaseId } from '#types/database'

/**
 * Query: List all active task statuses for an organization.
 */
export default class ListTaskStatusesQuery {
  async execute(organizationId: DatabaseId): Promise<TaskStatus[]> {
    return TaskStatusRepository.findByOrganization(organizationId)
  }
}
