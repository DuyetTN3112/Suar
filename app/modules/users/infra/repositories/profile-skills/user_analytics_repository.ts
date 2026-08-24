import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class UserAnalyticsRepository {
  private readonly __instanceMarker = true

  static {
    void new UserAnalyticsRepository().__instanceMarker
  }

  static async listWorkHistoryRows(
    userId: string,
    options: { periodStartSql?: string | null; periodEndSql?: string | null },
    trx: TransactionClientContract
  ): Promise<Record<string, unknown>[]> {
    const query = trx
      .from('user_work_history')
      .where('user_id', userId)
      .orderBy('completed_at', 'asc')

    if (options.periodStartSql) {
      void query.where('completed_at', '>=', options.periodStartSql)
    }

    if (options.periodEndSql) {
      void query.where('completed_at', '<=', options.periodEndSql)
    }

    const rows: unknown = await query.select(
      'task_type',
      'difficulty',
      'business_domain',
      'role_in_task',
      'collaboration_type',
      'actual_hours',
      'overall_quality_score',
      'was_on_time',
      'days_early_or_late',
      'completed_at'
    )
    return rows as Record<string, unknown>[]
  }

  static async listDomainExpertiseRows(
    userId: string,
    trx: TransactionClientContract
  ): Promise<Record<string, unknown>[]> {
    const rows: unknown = await trx
      .from('user_work_history')
      .where('user_id', userId)
      .select(
        'id',
        'tech_stack',
        'domain_tags',
        'business_domain',
        'problem_category',
        'skill_scores'
      )
    return rows as Record<string, unknown>[]
  }
}
