import { create } from './task_mutations.js'

import type { TaskCommandRepositoryPort } from '#actions/tasks/ports/task_command_repository_port'
import { TaskInfraMapper } from '#infra/tasks/mapper/task_infra_mapper'


export const taskCommandRepository: TaskCommandRepositoryPort = {
  async create(data, trx) {
    const model = await create(data, trx)

    return {
      task: TaskInfraMapper.toRecord(model),
      auditValues: TaskInfraMapper.toAuditValues(model),
    }
  },
}

