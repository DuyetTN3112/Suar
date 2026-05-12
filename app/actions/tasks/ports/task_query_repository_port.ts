import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { DatabaseId } from '#types/database'
import type { TaskDetailRecord, TaskDetailRelation, TaskIdentityRecord } from '#types/task_records'

export interface TaskIdentityQueryRepositoryPort {
  findActiveTaskIdentity(
    taskId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskIdentityRecord | null>
}

export interface TaskDetailQueryRepositoryPort {
  findByIdWithDetailRecord(
    taskId: DatabaseId,
    trx?: TransactionClientContract,
    optionalRelations?: TaskDetailRelation[]
  ): Promise<TaskDetailRecord>
}
