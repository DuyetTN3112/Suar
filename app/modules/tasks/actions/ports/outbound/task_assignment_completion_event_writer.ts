import type { TaskTransaction } from './task_transaction.js'

export interface TaskAssignmentCompletionEvent {
  taskId: string
  assignmentId: string
  assigneeId: string
}

/**
 * Persists one durable assignment-completion event on a caller-owned
 * transaction. Workflow ordering remains the responsibility of a Command.
 */
export interface TaskAssignmentCompletionEventWriter {
  stage(event: TaskAssignmentCompletionEvent, transaction: TaskTransaction): Promise<void>
}
