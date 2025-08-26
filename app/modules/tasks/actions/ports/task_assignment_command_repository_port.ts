import type { TransactionClientContract } from '@adonisjs/lucid/types/database'


export interface CompleteAssignmentsForCompletedTaskInput {
  taskId: string
  assignedTo: string | null
  changedBy: string
}

export interface CompletedTaskAssignmentRecord {
  id: string
  assignee_id: string
}

export interface TaskAssignmentCommandRepositoryPort {
  completeActiveAssignmentsForCompletedTask(
    input: CompleteAssignmentsForCompletedTaskInput,
    trx?: TransactionClientContract
  ): Promise<CompletedTaskAssignmentRecord[]>
}
