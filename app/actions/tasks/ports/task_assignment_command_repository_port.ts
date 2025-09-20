import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { DatabaseId } from '#types/database'

export interface CompleteAssignmentsForCompletedTaskInput {
  taskId: DatabaseId
  assignedTo: DatabaseId | null
  changedBy: DatabaseId
}

export interface CompletedTaskAssignmentRecord {
  id: DatabaseId
  assignee_id: DatabaseId
}

export interface TaskAssignmentCommandRepositoryPort {
  completeActiveAssignmentsForCompletedTask(
    input: CompleteAssignmentsForCompletedTaskInput,
    trx?: TransactionClientContract
  ): Promise<CompletedTaskAssignmentRecord[]>
}
