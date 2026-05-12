import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserWorkHistory from '#infra/users/models/user_work_history'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserWorkHistory.query({ client: trx }) : UserWorkHistory.query()
}

export const listRecentByUser = async (
  userId: DatabaseId,
  limit: number,
  trx?: TransactionClientContract
): Promise<UserWorkHistory[]> => {
  return baseQuery(trx).where('user_id', userId).orderBy('completed_at', 'desc').limit(limit)
}

export const findByUserAndAssignment = async (
  userId: DatabaseId,
  taskAssignmentId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserWorkHistory | null> => {
  return baseQuery(trx)
    .where('user_id', userId)
    .where('task_assignment_id', taskAssignmentId)
    .first()
}

export const listByUser = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserWorkHistory[]> => {
  return baseQuery(trx).where('user_id', userId).orderBy('completed_at', 'asc')
}
