import type { TaskStatusQueryRepositoryPort } from '#actions/tasks/ports/task_status_query_repository_port'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'

export const taskStatusQueryRepository: TaskStatusQueryRepositoryPort = {
  async findByIdAndOrgActive(statusId, organizationId, trx) {
    return TaskStatusRepository.findByIdAndOrgActive(statusId, organizationId, trx)
  },
}

