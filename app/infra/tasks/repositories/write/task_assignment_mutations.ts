import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import TaskAssignment from '#infra/tasks/models/task_assignment'
import { AssignmentStatus, AssignmentType } from '#modules/tasks/constants/task_constants'
import type { DatabaseId } from '#types/database'

export async function create(
  data: Partial<TaskAssignment>,
  trx?: TransactionClientContract
): Promise<TaskAssignment> {
  return TaskAssignment.create(data, trx ? { client: trx } : undefined)
}

export async function cancelAssignment(
  assignmentId: DatabaseId,
  notes: string,
  trx?: TransactionClientContract
): Promise<void> {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  await query.where('id', assignmentId).update({
    assignment_status: AssignmentStatus.CANCELLED,
    completion_notes: notes,
  })
}

export async function completeActiveAssignmentsForCompletedTask(
  input: {
    taskId: DatabaseId
    assignedTo: DatabaseId | null
    changedBy: DatabaseId
  },
  trx?: TransactionClientContract
): Promise<{ id: DatabaseId; assignee_id: DatabaseId }[]> {
  const baseQuery = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  let completedAssignments = await baseQuery
    .where('task_id', input.taskId)
    .where('assignment_status', AssignmentStatus.ACTIVE)

  if (completedAssignments.length === 0 && input.assignedTo) {
    const existingAssignmentQuery = trx
      ? TaskAssignment.query({ client: trx })
      : TaskAssignment.query()
    const existingAssignment = await existingAssignmentQuery
      .where('task_id', input.taskId)
      .where('assignee_id', input.assignedTo)
      .whereIn('assignment_status', [AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED])
      .orderBy('assigned_at', 'desc')
      .first()

    if (existingAssignment) {
      completedAssignments = [existingAssignment]
    } else {
      const fallbackAssignment = await TaskAssignment.create(
        {
          task_id: input.taskId,
          assignee_id: input.assignedTo,
          assigned_by: input.changedBy,
          assignment_type: AssignmentType.MEMBER,
          assignment_status: AssignmentStatus.COMPLETED,
          progress_percentage: 100,
          assigned_at: DateTime.now(),
          completed_at: DateTime.now(),
        },
        trx ? { client: trx } : undefined
      )

      completedAssignments = [fallbackAssignment]
    }
  }

  const completedStatus: TaskAssignment['assignment_status'] = AssignmentStatus.COMPLETED

  for (const assignment of completedAssignments) {
    if (assignment.assignment_status !== completedStatus) {
      assignment.assignment_status = completedStatus
      assignment.completed_at = DateTime.now()
      if (trx) {
        assignment.useTransaction(trx)
      }
      await assignment.save()
    }
  }

  return completedAssignments.map((assignment) => ({
    id: assignment.id,
    assignee_id: assignment.assignee_id,
  }))
}
