import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskAssignment from '#modules/tasks/infra/models/task-assignment/task_assignment'
import { AssignmentStatus } from '#modules/tasks/public_contracts/task_constants'

export async function findWithTaskForUpdate(
  assignmentId: string,
  trx?: TransactionClientContract
) {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query.where('id', assignmentId).preload('task').forUpdate().first()
}

export async function findCompletedById(
  assignmentId: string,
  trx?: TransactionClientContract
): Promise<TaskAssignment | null> {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query
    .where('id', assignmentId)
    .where('assignment_status', AssignmentStatus.COMPLETED)
    .preload('task')
    .first()
}

export async function findActiveByTask(
  taskId: string,
  trx?: TransactionClientContract
): Promise<TaskAssignment | null> {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query
    .where('task_id', taskId)
    .where('assignment_status', AssignmentStatus.ACTIVE)
    .first()
}

export async function findActiveAssignmentsByTask(
  taskId: string,
  trx?: TransactionClientContract
): Promise<TaskAssignment[]> {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query
    .where('task_id', taskId)
    .where('assignment_status', AssignmentStatus.ACTIVE)
    .orderBy('assigned_at', 'asc')
}

export async function findActiveByUserAndTask(
  userId: string,
  taskId: string,
  trx?: TransactionClientContract
): Promise<TaskAssignment | null> {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query
    .where('assignee_id', userId)
    .where('task_id', taskId)
    .where('assignment_status', AssignmentStatus.ACTIVE)
    .first()
}

export async function findAccessibleByUserAndTask(
  userId: string,
  taskId: string,
  trx?: TransactionClientContract
): Promise<TaskAssignment | null> {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query
    .where('assignee_id', userId)
    .where('task_id', taskId)
    .whereIn('assignment_status', [AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED])
    .orderByRaw('CASE WHEN assignment_status = ? THEN 0 ELSE 1 END', [AssignmentStatus.ACTIVE])
    .orderBy('assigned_at', 'desc')
    .first()
}
