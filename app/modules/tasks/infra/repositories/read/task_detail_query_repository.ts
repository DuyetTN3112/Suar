import { findByIdWithDetailRelations } from './detail_queries.js'

import type { TaskDetailQueryRepositoryPort } from '#modules/tasks/actions/ports/task_query_repository_port'
import { TaskInfraMapper } from '#modules/tasks/infra/mapper/task_infra_mapper'


export const taskDetailQueryRepository: TaskDetailQueryRepositoryPort = {
  async findByIdWithDetailRecord(taskId, trx, optionalRelations) {
    const model = await findByIdWithDetailRelations(taskId, trx, optionalRelations)
    return TaskInfraMapper.toDetailRecord(model)
  },
}

