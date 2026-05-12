import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserWorkHistory from '#infra/users/models/user_work_history'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserWorkHistory.query({ client: trx }) : UserWorkHistory.query()
}

export const create = async (
  data: Partial<UserWorkHistory>,
  trx?: TransactionClientContract
): Promise<UserWorkHistory> => {
  return UserWorkHistory.create(data, trx ? { client: trx } : undefined)
}

export const save = async (
  workHistory: UserWorkHistory,
  trx?: TransactionClientContract
): Promise<UserWorkHistory> => {
  if (trx) {
    workHistory.useTransaction(trx)
  }
  await workHistory.save()
  return workHistory
}

export const deleteByUser = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<void> => {
  await baseQuery(trx).where('user_id', userId).delete()
}
