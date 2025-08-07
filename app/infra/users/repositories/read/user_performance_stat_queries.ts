import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserPerformanceStat from '#infra/users/models/user_performance_stat'
import type { DatabaseId } from '#types/database'

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserPerformanceStat.query({ client: trx }) : UserPerformanceStat.query()
}

export const findLatestLifetimeByUser = async (
  userId: DatabaseId,
  trx?: TransactionClientContract
): Promise<UserPerformanceStat | null> => {
  return baseQuery(trx)
    .where('user_id', userId)
    .whereNull('period_start')
    .whereNull('period_end')
    .orderBy('calculated_at', 'desc')
    .first()
}

export const findByUserAndPeriod = async (
  userId: DatabaseId,
  periodStart: string | null,
  periodEnd: string | null,
  trx?: TransactionClientContract
): Promise<UserPerformanceStat | null> => {
  const query = baseQuery(trx).where('user_id', userId)

  if (periodStart) {
    void query.where('period_start', periodStart)
  } else {
    void query.whereNull('period_start')
  }

  if (periodEnd) {
    void query.where('period_end', periodEnd)
  } else {
    void query.whereNull('period_end')
  }

  return query.first()
}
