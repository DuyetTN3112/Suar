import type { TaskTransaction } from './task_transaction.js'

import type { AssignmentType } from '#modules/tasks/public_contracts/task_constants'
import type { TaskAssignmentWithTaskRecord } from '#modules/tasks/types/task_records'

export interface TaskAssignmentRecord {
  id: string
  task_id: string
  assignee_id: string
  assigned_by: string
  assigned_at: string
  assignment_status: 'active' | 'completed' | 'cancelled'
}

export abstract class TaskAssignmentRepository {
  abstract findActiveByTask(
    taskId: string,
    transaction?: TaskTransaction
  ): Promise<TaskAssignmentRecord | null>

  abstract findWithTaskForUpdate(
    assignmentId: string,
    transaction: TaskTransaction
  ): Promise<TaskAssignmentWithTaskRecord | null>

  abstract create(
    data: {
      task_id: string
      assignee_id: string
      assigned_by: string
      assignment_type: AssignmentType
      assignment_status: 'active'
      assigned_at: unknown
      estimated_hours?: number
    },
    transaction?: TaskTransaction
  ): Promise<TaskAssignmentRecord>

  abstract cancel(
    assignmentId: string,
    notes: string,
    transaction?: TaskTransaction
  ): Promise<void>

  abstract completeActiveForTask(
    input: {
      taskId: string
      assignedTo: string | null
      changedBy: string
    },
    transaction?: TaskTransaction
  ): Promise<Array<{ id: string; assignee_id: string }>>
}
