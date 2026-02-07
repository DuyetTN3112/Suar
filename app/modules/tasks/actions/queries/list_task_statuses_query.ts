import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import type { DatabaseId } from '#types/database'
import type { TaskStatusRecord } from '#types/task_records'

/**
 * Query: List all active task statuses for an organization.
 */
export default class ListTaskStatusesQuery {
  async execute(organizationId: DatabaseId): Promise<TaskStatusRecord[]> {
    return TaskStatusRepository.findByOrganization(organizationId)
  }
}
