import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { DatabaseId } from '#types/database'
import type { TaskStatusRecord } from '#types/task_records'

export interface TaskStatusQueryRepositoryPort {
  findByIdAndOrgActive(
    statusId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<TaskStatusRecord | null>
}
