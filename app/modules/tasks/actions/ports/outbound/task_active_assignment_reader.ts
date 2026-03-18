import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface TaskActiveAssignmentReader {
  findActiveAssignment(taskId: string, trx?: TaskTransaction): Promise<{ assigneeId: string } | null>
}
