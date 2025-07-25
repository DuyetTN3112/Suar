import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserPerformanceStat from '#infra/users/models/user_performance_stat'

export const create = async (
  data: Partial<UserPerformanceStat>,
  trx?: TransactionClientContract
): Promise<UserPerformanceStat> => {
  return UserPerformanceStat.create(data, trx ? { client: trx } : undefined)
}

export const save = async (
  stat: UserPerformanceStat,
  trx?: TransactionClientContract
): Promise<UserPerformanceStat> => {
  if (trx) {
    stat.useTransaction(trx)
  }
  await stat.save()
  return stat
}
