import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { CreateTaskPersistencePayload } from '#actions/tasks/support/task_create_payload_builder'
import type { CreateTaskRepositoryResult } from '#types/task_records'

export interface TaskCommandRepositoryPort {
  create(
    data: CreateTaskPersistencePayload,
    trx?: TransactionClientContract
  ): Promise<CreateTaskRepositoryResult>
}
