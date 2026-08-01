import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskStatusQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_status_query_repository_port'
import TaskStatusRepository from '#modules/tasks/infra/repositories/task_status_repository'

export const taskStatusQueryRepository: TaskStatusQueryRepositoryPort = {
  async findByIdAndOrgActive(statusId, organizationId, trx) {
    return TaskStatusRepository.findByIdAndOrgActive(
      statusId,
      organizationId,
      trx as TransactionClientContract | undefined
    )
  },

  findByOrganization(organizationId) {
    return TaskStatusRepository.findByOrganization(organizationId)
  },
}

