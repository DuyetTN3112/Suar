import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

export interface TaskStatusQueryRepositoryPort {
  findByIdAndOrgActive(
    statusId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<TaskStatusRecord | null>
}
