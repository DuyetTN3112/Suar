import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { TaskActiveAssignmentReader } from '#modules/tasks/actions/ports/outbound/task_active_assignment_reader'
import { findActiveByTask } from '#modules/tasks/infra/repositories/read/task_assignment_queries'

export class TaskActiveAssignmentReaderAdapter implements TaskActiveAssignmentReader {
  async findActiveAssignment(taskId: string, trx?: TransactionClientContract) {
    const assignment = await findActiveByTask(taskId, trx)
    return assignment ? { assigneeId: assignment.assignee_id } : null
  }
}
