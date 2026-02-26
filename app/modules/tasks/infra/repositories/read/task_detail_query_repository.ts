import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { findByIdWithDetailRelations } from './detail_queries.js'

import type { TaskDetailQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_query_repository_port'
import { TaskInfraMapper } from '#modules/tasks/infra/mapper/task_infra_mapper'


export const taskDetailQueryRepository: TaskDetailQueryRepositoryPort = {
  async findByIdWithDetailRecord(taskId, trx, optionalRelations) {
    const model = await findByIdWithDetailRelations(
      taskId,
      trx as TransactionClientContract | undefined,
      optionalRelations
    )
    return TaskInfraMapper.toDetailRecord(model)
  },
}
