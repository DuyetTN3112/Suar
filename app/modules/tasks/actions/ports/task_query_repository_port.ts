import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskDetailRecord, TaskDetailRelation, TaskIdentityRecord } from '#modules/tasks/types/task_records'

export interface TaskIdentityQueryRepositoryPort {
  findActiveTaskIdentity(
    taskId: string,
    trx?: TransactionClientContract
  ): Promise<TaskIdentityRecord | null>
}

export interface TaskDetailQueryRepositoryPort {
  findByIdWithDetailRecord(
    taskId: string,
    trx?: TransactionClientContract,
    optionalRelations?: TaskDetailRelation[]
  ): Promise<TaskDetailRecord>
}
