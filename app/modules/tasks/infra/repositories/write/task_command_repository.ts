import { create } from './task_mutations.js'

import type { TaskCommandRepositoryPort } from '#modules/tasks/actions/ports/task_command_repository_port'
import { TaskInfraMapper } from '#modules/tasks/infra/mapper/task_infra_mapper'


export const taskCommandRepository: TaskCommandRepositoryPort = {
  async create(data, trx) {
    const model = await create(data, trx)

    return {
      task: TaskInfraMapper.toRecord(model),
      auditValues: TaskInfraMapper.toAuditValues(model),
    }
  },
}

