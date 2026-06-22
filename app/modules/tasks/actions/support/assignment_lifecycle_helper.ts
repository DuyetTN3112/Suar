import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import TaskAssignment from '#modules/tasks/infra/models/task_assignment'
import { AssignmentStatus, AssignmentType } from '#modules/tasks/public_contracts/task_constants'

/**
 * AssignmentLifecycleHelper — single source of truth for assignment lifecycle.
 *
 * Invariant: if a task has a current active assignee, tasks.assigned_to
 * must equal task_assignments.assignee_id of that active assignment.
 *
 * Every assign/reassign/unassign must go through this helper so cache
 * and lifecycle table stay in sync.
 */
export interface SyncAssignmentInput {
  taskId: string
  assigneeId: string | null
  assignedBy: string
  assignmentType?: AssignmentType
  assignedByName?: string
}

/**
 * Sync assignment lifecycle: create/cancel/update task_assignments row,
 * then update tasks.assigned_to cache.
 *
 * - Assign: create active assignment, set cache.
 * - Reassign: cancel old active, create new active, update cache.
 * - Unassign: cancel active, clear cache.
 */
export async function syncAssignment(
  input: SyncAssignmentInput,
  trx: TransactionClientContract
): Promise<void> {
  const { taskId, assigneeId, assignedBy, assignmentType = AssignmentType.MEMBER } = input

  // Cancel any existing active assignment for this task
  await cancelActiveAssignment(taskId, trx)

  if (assigneeId) {
    // Create new active assignment
    await TaskAssignment.create(
      {
        task_id: taskId,
        assignee_id: assigneeId,
        assigned_by: assignedBy,
        assignment_type: assignmentType,
        assignment_status: AssignmentStatus.ACTIVE,
        assigned_at: DateTime.now(),
      },
      { client: trx }
    )
  }

  // Update denormalized cache on tasks
  await db
    .from('tasks')
    .where('id', taskId)
    .update({
      assigned_to: assigneeId,
      updated_by: assignedBy,
    })
    .useTransaction(trx)
}

/**
 * Cancel the currently active assignment for a task.
 */
export async function cancelActiveAssignment(
  taskId: string,
  trx: TransactionClientContract
): Promise<void> {
  await TaskAssignment.query({ client: trx })
    .where('task_id', taskId)
    .where('assignment_status', AssignmentStatus.ACTIVE)
    .update({
      assignment_status: AssignmentStatus.CANCELLED,
    })
}

/**
 * Complete the active assignment for a task (used on task completion).
 */
export async function completeActiveAssignment(
  taskId: string,
  assigneeId: string,
  trx: TransactionClientContract
): Promise<void> {
  const active = await TaskAssignment.query({ client: trx })
    .where('task_id', taskId)
    .where('assignee_id', assigneeId)
    .where('assignment_status', AssignmentStatus.ACTIVE)
    .first()

  if (active) {
    active.assignment_status = AssignmentStatus.COMPLETED
    active.completed_at = DateTime.now()
    active.progress_percentage = 100
    await active.save()
  }
}
