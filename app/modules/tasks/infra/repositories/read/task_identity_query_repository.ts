import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { findActiveTaskIdentity } from './detail_queries.js'

import type { TaskIdentityQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_query_repository_port'


export const taskIdentityQueryRepository: TaskIdentityQueryRepositoryPort = {
  async findActiveTaskIdentity(taskId, trx) {
    const task = await findActiveTaskIdentity(
      taskId,
      trx as TransactionClientContract | undefined
    )

    if (!task) {
      return null
    }

    return {
      id: task.id,
      organization_id: task.organization_id,
    }
  },
}
