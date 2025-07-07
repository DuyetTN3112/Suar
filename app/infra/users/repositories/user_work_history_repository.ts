import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import UserWorkHistory from '#models/user_work_history'
import type { DatabaseId } from '#types/database'

export default class UserWorkHistoryRepository {
  private readonly __instanceMarker = true

  static {
    void new UserWorkHistoryRepository().__instanceMarker
  }

  private static baseQuery(trx?: TransactionClientContract) {
    return trx ? UserWorkHistory.query({ client: trx }) : UserWorkHistory.query()
  }

  static async listRecentByUser(
    userId: DatabaseId,
    limit: number,
    trx?: TransactionClientContract
  ): Promise<UserWorkHistory[]> {
    return this.baseQuery(trx).where('user_id', userId).orderBy('completed_at', 'desc').limit(limit)
  }

  static async create(
    data: Partial<UserWorkHistory>,
    trx?: TransactionClientContract
  ): Promise<UserWorkHistory> {
    return UserWorkHistory.create(data, trx ? { client: trx } : undefined)
  }

  static async save(
    workHistory: UserWorkHistory,
    trx?: TransactionClientContract
  ): Promise<UserWorkHistory> {
    if (trx) {
      workHistory.useTransaction(trx)
    }
    await workHistory.save()
    return workHistory
  }

  static async deleteByUser(userId: DatabaseId, trx?: TransactionClientContract): Promise<void> {
    await this.baseQuery(trx).where('user_id', userId).delete()
  }

  static async findByUserAndAssignment(
    userId: DatabaseId,
    taskAssignmentId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserWorkHistory | null> {
    return this.baseQuery(trx)
      .where('user_id', userId)
      .where('task_assignment_id', taskAssignmentId)
      .first()
  }

  static async listByUser(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserWorkHistory[]> {
    return this.baseQuery(trx).where('user_id', userId).orderBy('completed_at', 'asc')
  }
}
