import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskVersionWriter } from '#modules/tasks/actions/ports/outbound/task_version_writer'
import TaskVersionRepository from '#modules/tasks/infra/repositories/task_version_repository'

export class LucidTaskVersionWriter implements TaskVersionWriter {
  createSnapshot(
    taskId: string,
    snapshotData: Record<string, unknown>,
    userId: string,
    transaction?: TaskTransaction
  ): Promise<void> {
    return TaskVersionRepository.createSnapshot(
      taskId,
      snapshotData,
      userId,
      transaction as TransactionClientContract | undefined
    )
  }
}
