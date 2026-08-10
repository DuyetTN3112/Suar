import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { create } from './task_mutations.js'

import type { TaskCommandRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_command_repository_port'
import { TaskInfraMapper } from '#modules/tasks/infra/adapters/task-authoring/task_infra_mapper'


export const taskCommandRepository: TaskCommandRepositoryPort = {
  async create(data, trx) {
    const model = await create(data, trx as TransactionClientContract | undefined)

    return {
      task: TaskInfraMapper.toRecord(model),
      auditValues: TaskInfraMapper.toAuditValues(model),
    }
  },
}
