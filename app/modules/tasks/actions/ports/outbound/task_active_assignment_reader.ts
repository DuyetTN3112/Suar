import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface TaskActiveAssignmentReader {
  findActiveAssignment(
    taskId: string,
    trx?: TaskTransaction
  ): Promise<{ id: string; assigneeId: string } | null>

  findActorAssignment(
    taskId: string,
    actorId: string,
    trx?: TaskTransaction
  ): Promise<{
    id: string
    assigneeId: string
    status: 'active' | 'completed'
  } | null>
}
