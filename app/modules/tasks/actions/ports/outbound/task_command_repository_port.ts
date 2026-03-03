import type { CreateTaskPersistencePayload } from '#modules/tasks/actions/mapper/task_create_persistence_mapper'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { CreateTaskRepositoryResult } from '#modules/tasks/types/task_records'

export interface TaskCommandRepositoryPort {
  create(
    data: CreateTaskPersistencePayload,
    trx?: TaskTransaction
  ): Promise<CreateTaskRepositoryResult>
}
