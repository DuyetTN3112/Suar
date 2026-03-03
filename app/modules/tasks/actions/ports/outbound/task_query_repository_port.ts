import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskDetailRecord, TaskDetailRelation, TaskIdentityRecord } from '#modules/tasks/types/task_records'

export interface TaskIdentityQueryRepositoryPort {
  findActiveTaskIdentity(
    taskId: string,
    trx?: TaskTransaction
  ): Promise<TaskIdentityRecord | null>
}

export interface TaskDetailQueryRepositoryPort {
  findByIdWithDetailRecord(
    taskId: string,
    trx?: TaskTransaction,
    optionalRelations?: TaskDetailRelation[]
  ): Promise<TaskDetailRecord>
}
