import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskActiveAssignmentReader } from '#modules/tasks/actions/ports/outbound/task_active_assignment_reader'
import {
  findAccessibleByUserAndTask,
  findActiveByTask,
} from '#modules/tasks/infra/repositories/task-assignment/read/task_assignment_queries'

export class TaskActiveAssignmentReaderAdapter implements TaskActiveAssignmentReader {
  async findActiveAssignment(taskId: string, trx?: TransactionClientContract) {
    const assignment = await findActiveByTask(taskId, trx)
    return assignment ? { id: assignment.id, assigneeId: assignment.assignee_id } : null
  }

  async findActorAssignment(
    taskId: string,
    actorId: string,
    trx?: TransactionClientContract
  ) {
    const assignment = await findAccessibleByUserAndTask(actorId, taskId, trx)
    if (!assignment) return null
    return {
      id: assignment.id,
      assigneeId: assignment.assignee_id,
      status: assignment.assignment_status as 'active' | 'completed',
    }
  }
}
