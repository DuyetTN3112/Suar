import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

/**
 * Query: List all active task statuses for an organization.
 */
export default class ListTaskStatusesQuery {
  async execute(organizationId: string): Promise<TaskStatusRecord[]> {
    return TaskStatusRepository.findByOrganization(organizationId)
  }
}
