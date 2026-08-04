import type { TaskTransaction } from './task_transaction.js'

export type TaskSearchProjectionInvalidationOperation = 'upsert' | 'delete'

export interface TaskSearchProjectionInvalidationStager {
  stage(input: {
    readonly taskId: string
    readonly operation: TaskSearchProjectionInvalidationOperation
    readonly sourceRevision?: string
    readonly changedFields: readonly string[]
  }, transaction: TaskTransaction): Promise<{ readonly id: string; readonly staged: boolean }>
}
