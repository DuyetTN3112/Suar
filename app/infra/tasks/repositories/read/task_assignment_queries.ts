import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import TaskAssignment from '#infra/tasks/models/task_assignment'
import { AssignmentStatus } from '#modules/tasks/constants/task_constants'
import type { DatabaseId } from '#types/database'

export async function findActiveWithDetails(
  assignmentId: DatabaseId,
  trx?: TransactionClientContract
) {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query.where('id', assignmentId).preload('task').preload('assignee').forUpdate().first()
}

export async function findCompletedById(
  assignmentId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskAssignment | null> {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query
    .where('id', assignmentId)
    .where('assignment_status', AssignmentStatus.COMPLETED)
    .first()
}

export async function findActiveByTask(
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskAssignment | null> {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query
    .where('task_id', taskId)
    .where('assignment_status', AssignmentStatus.ACTIVE)
    .first()
}

export async function findActiveAssignmentsByTask(
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskAssignment[]> {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query
    .where('task_id', taskId)
    .where('assignment_status', AssignmentStatus.ACTIVE)
    .orderBy('assigned_at', 'asc')
}

export async function findActiveByUserAndTask(
  userId: DatabaseId,
  taskId: DatabaseId,
  trx?: TransactionClientContract
): Promise<TaskAssignment | null> {
  const query = trx ? TaskAssignment.query({ client: trx }) : TaskAssignment.query()
  return query
    .where('assignee_id', userId)
    .where('task_id', taskId)
    .where('assignment_status', AssignmentStatus.ACTIVE)
    .first()
}
