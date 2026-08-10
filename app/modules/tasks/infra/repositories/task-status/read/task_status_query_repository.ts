import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task-status/task_status_repository'

export const taskStatusQueryRepository: TaskStatusQueryRepositoryPort = {
  async findByIdAndOrgActive(statusId, organizationId, trx, projectId) {
    return TaskStatusRepository.findByIdAndOrgActive(
      statusId,
      organizationId,
      trx as TransactionClientContract | undefined,
      projectId
    )
  },

  findByOrganization(organizationId) {
    return TaskStatusRepository.findByOrganization(organizationId)
  },

  findByProject(projectId, organizationId) {
    return TaskStatusRepository.findByProject(projectId, undefined, organizationId)
  },
}
