import type { TaskTransaction } from './task_transaction.js'

export interface TaskVersionWriter {
  createSnapshot(
    taskId: string,
    snapshotData: Record<string, unknown>,
    userId: string,
    transaction?: TaskTransaction
  ): Promise<void>
}
