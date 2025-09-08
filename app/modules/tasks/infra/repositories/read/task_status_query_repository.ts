import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/task_status_query_repository_port'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'

export const taskStatusQueryRepository: TaskStatusQueryRepositoryPort = {
  async findByIdAndOrgActive(statusId, organizationId, trx) {
    return TaskStatusRepository.findByIdAndOrgActive(statusId, organizationId, trx)
  },
}

