import { findActiveTaskIdentity } from './detail_queries.js'

import type { TaskIdentityQueryRepositoryPort } from '#actions/tasks/ports/task_query_repository_port'


export const taskIdentityQueryRepository: TaskIdentityQueryRepositoryPort = {
  async findActiveTaskIdentity(taskId, trx) {
    const task = await findActiveTaskIdentity(taskId, trx)

    if (!task) {
      return null
    }

    return {
      id: task.id,
      organization_id: task.organization_id,
    }
  },
}

