import { DateTime } from 'luxon'

import type { TaskAssignmentRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import {
  AssignmentType,
} from '#modules/tasks/public_contracts/task_constants'

export interface SyncAssignmentInput {
  taskId: string
  assigneeId: string | null
  assignedBy: string
  assignmentType?: AssignmentType
  estimatedHours?: number
}

/**
 * Reusable application collaborator for the assignment sub-operation used by
 * both assignment and application-approval commands.
 */
export async function synchronizeTaskAssignment(
  input: SyncAssignmentInput,
  transaction: TaskTransaction,
  assignments: TaskAssignmentRepository,
  tasks: TaskLifecycleRepository
): Promise<void> {
  const active = await assignments.findActiveByTask(input.taskId, transaction)
  if (input.assigneeId !== null && active?.assignee_id === input.assigneeId) {
    await tasks.updateTask(
      input.taskId,
      {
        assigned_to: input.assigneeId,
        updated_by: input.assignedBy,
      },
      transaction
    )
    return
  }

  if (active) {
    await assignments.cancel(
      active.id,
      `Reassigned by user_id: ${input.assignedBy}`,
      transaction
    )
  }

  if (input.assigneeId !== null) {
    await assignments.create(
      {
        task_id: input.taskId,
        assignee_id: input.assigneeId,
        assigned_by: input.assignedBy,
        assignment_type: input.assignmentType ?? AssignmentType.MEMBER,
        assignment_status: 'active',
        assigned_at: DateTime.now(),
        ...(input.estimatedHours === undefined
          ? {}
          : { estimated_hours: input.estimatedHours }),
      },
      transaction
    )
  }
  await tasks.updateTask(
    input.taskId,
    {
      assigned_to: input.assigneeId,
      updated_by: input.assignedBy,
    },
    transaction
  )
}
