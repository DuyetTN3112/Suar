import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserPerformanceStat from '#infra/users/models/user_performance_stat'
import type { DatabaseId } from '#types/database'

export default class UserPerformanceStatRepository {
  private readonly __instanceMarker = true

  static {
    void new UserPerformanceStatRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? UserPerformanceStat.query({ client: trx }) : UserPerformanceStat.query()
  }

  static async findLatestLifetimeByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserPerformanceStat | null> {
    return this.baseQuery(trx)
      .where('user_id', userId)
      .whereNull('period_start')
      .whereNull('period_end')
      .orderBy('calculated_at', 'desc')
      .first()
  }

  static async findByUserAndPeriod(
    userId: DatabaseId,
    periodStart: string | null,
    periodEnd: string | null,
    trx?: TransactionClientContract
  ): Promise<UserPerformanceStat | null> {
    const query = this.baseQuery(trx).where('user_id', userId)

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

  static async create(
    data: Partial<UserPerformanceStat>,
    trx?: TransactionClientContract
  ): Promise<UserPerformanceStat> {
    return UserPerformanceStat.create(data, trx ? { client: trx } : undefined)
  }

  static async save(
    stat: UserPerformanceStat,
    trx?: TransactionClientContract
  ): Promise<UserPerformanceStat> {
    if (trx) {
      stat.useTransaction(trx)
    }
    await stat.save()
    return stat
  }
}
