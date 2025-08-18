import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { BaseCommand } from '#actions/shared/base_command'
import {
  calculatePerformanceAggregateMetrics,
  type PerformanceAggregateMetrics,
  type PerformanceAggregateRow,
  type SelfAssessmentAccuracyRow,
} from '#domain/users/profile_aggregate_rules'
import UserAnalyticsRepository from '#infra/users/repositories/user_analytics_repository'
import UserPerformanceStatRepository from '#infra/users/repositories/user_performance_stat_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import type { DatabaseId } from '#types/database'

export interface UpsertUserPerformanceStatsDTO {
  userId: DatabaseId
  periodStart?: string | null
  periodEnd?: string | null
}

export interface UpsertUserPerformanceStatsResult {
  userId: DatabaseId
  statsId: DatabaseId
  totalTasksCompleted: number
  performanceScore: number | null
}

interface HistoryRow {
  task_type: string | null
  difficulty: string | null
  business_domain: string | null
  role_in_task: string | null
  collaboration_type: string | null
  actual_hours: number | string | null
  overall_quality_score: number | string | null
  was_on_time: boolean | null
  days_early_or_late: number | string | null
  completed_at: Date | string | null
}

interface ResolvedPeriod {
  periodStart: DateTime | null
  periodEnd: DateTime | null
  periodStartSql: string | null
  periodEndSql: string | null
}

interface LoadedPerformanceInputs {
  historyRows: PerformanceAggregateRow[]
  selfAssessmentRows: SelfAssessmentAccuracyRow[]
  performanceScore: number | null
}

export default class UpsertUserPerformanceStatsCommand extends BaseCommand<
  UpsertUserPerformanceStatsDTO,
  UpsertUserPerformanceStatsResult
> {
  private normalizePeriod(value: string | null | undefined): DateTime | null {
    if (!value) return null

    const parsed = DateTime.fromISO(value)
    return parsed.isValid ? parsed : null
  }

  private toNumber(value: number | string | null): number | null {
    if (value === null) return null
    const converted = Number(value)
    return Number.isFinite(converted) ? converted : null
  }

  private resolvePeriod(dto: UpsertUserPerformanceStatsDTO): ResolvedPeriod {
    const periodStart = this.normalizePeriod(dto.periodStart)
    const periodEnd = this.normalizePeriod(dto.periodEnd)

    return {
      periodStart,
      periodEnd,
      periodStartSql: periodStart?.toSQL() ?? null,
      periodEndSql: periodEnd?.toSQL() ?? null,
    }
  }

  private mapHistoryRows(rows: HistoryRow[]): PerformanceAggregateRow[] {
    return rows.map((row) => ({
      taskType: row.task_type,
      difficulty: row.difficulty,
      businessDomain: row.business_domain,
      roleInTask: row.role_in_task,
      collaborationType: row.collaboration_type,
      actualHours: this.toNumber(row.actual_hours),
      overallQualityScore: this.toNumber(row.overall_quality_score),
      wasOnTime: row.was_on_time,
      daysEarlyOrLate: this.toNumber(row.days_early_or_late),
    }))
  }

  private mapSelfAssessmentRows(
    rows: { overall_satisfaction: number | string; overall_quality_score: number | string }[]
  ): SelfAssessmentAccuracyRow[] {
    return rows.map((row) => ({
      selfScore: this.toNumber(row.overall_satisfaction),
      reviewedScore: this.toNumber(row.overall_quality_score),
    }))
  }

  private async loadPerformanceInputs(
    userId: DatabaseId,
    period: ResolvedPeriod,
    trx: TransactionClientContract
  ): Promise<LoadedPerformanceInputs> {
    const historyRows = (await UserAnalyticsRepository.listWorkHistoryRows(
      userId,
      {
        periodStartSql: period.periodStartSql,
        periodEndSql: period.periodEndSql,
      },
      trx
    )) as HistoryRow[]

    const selfAssessmentRows = (await UserAnalyticsRepository.listSelfAssessmentAccuracyRows(
      userId,
      {
        periodStartSql: period.periodStartSql,
        periodEndSql: period.periodEndSql,
      },
      trx
    )) as { overall_satisfaction: number | string; overall_quality_score: number | string }[]

    const user = await UserRepository.findNotDeletedOrFail(userId, trx)

    return {
      historyRows: this.mapHistoryRows(historyRows),
      selfAssessmentRows: this.mapSelfAssessmentRows(selfAssessmentRows),
      performanceScore: user.trust_data?.performance_score ?? null,
    }
  }

  private buildPerformancePayload(
    userId: DatabaseId,
    period: ResolvedPeriod,
    metrics: PerformanceAggregateMetrics,
    performanceScore: number | null
  ) {
    return {
      user_id: userId,
      period_start: period.periodStart,
      period_end: period.periodEnd,
      total_tasks_completed: metrics.totalTasksCompleted,
      total_hours_worked: metrics.totalHoursWorked,
      avg_quality_score: metrics.avgQualityScore,
      on_time_delivery_rate: metrics.onTimeDeliveryRate,
      avg_days_early_or_late: metrics.avgDaysEarlyOrLate,
      performance_score: performanceScore,
      tasks_by_type: metrics.tasksByType,
      tasks_by_difficulty: metrics.tasksByDifficulty,
      tasks_by_domain: metrics.tasksByDomain,
      tasks_as_lead: metrics.tasksAsLead,
      tasks_as_sole_contributor: metrics.tasksAsSoleContributor,
      tasks_mentoring_others: metrics.tasksMentoringOthers,
      longest_on_time_streak: metrics.longestOnTimeStreak,
      current_on_time_streak: metrics.currentOnTimeStreak,
      self_assessment_accuracy: metrics.selfAssessmentAccuracy,
      calculated_at: DateTime.now(),
    }
  }

  private async persistPerformanceStats(
    userId: DatabaseId,
    period: ResolvedPeriod,
    payload: ReturnType<UpsertUserPerformanceStatsCommand['buildPerformancePayload']>,
    trx: TransactionClientContract
  ): Promise<DatabaseId> {
    const existing = await UserPerformanceStatRepository.findByUserAndPeriod(
      userId,
      period.periodStartSql,
      period.periodEndSql,
      trx
    )

    if (existing) {
      existing.merge(payload)
      await UserPerformanceStatRepository.save(existing, trx)
      return existing.id
    }

    const created = await UserPerformanceStatRepository.create(payload, trx)
    return created.id
  }

  private async logUpsertAudit(
    userId: DatabaseId,
    period: ResolvedPeriod,
    statsId: DatabaseId,
    metrics: PerformanceAggregateMetrics,
    performanceScore: number | null
  ): Promise<void> {
    await this.logAudit('upsert_user_performance_stats', 'user_performance_stats', userId, null, {
      stats_id: statsId,
      period_start: period.periodStart?.toISO() ?? null,
      period_end: period.periodEnd?.toISO() ?? null,
      total_tasks_completed: metrics.totalTasksCompleted,
      performance_score: performanceScore,
    })
  }

  async handle(dto: UpsertUserPerformanceStatsDTO): Promise<UpsertUserPerformanceStatsResult> {
    const period = this.resolvePeriod(dto)

    return await this.executeInTransaction(async (trx) => {
      const inputs = await this.loadPerformanceInputs(dto.userId, period, trx)
      const metrics = calculatePerformanceAggregateMetrics({
        rows: inputs.historyRows,
        selfAssessmentRows: inputs.selfAssessmentRows,
      })
      const payload = this.buildPerformancePayload(
        dto.userId,
        period,
        metrics,
        inputs.performanceScore
      )
      const statsId = await this.persistPerformanceStats(dto.userId, period, payload, trx)
      await this.logUpsertAudit(dto.userId, period, statsId, metrics, inputs.performanceScore)

      return {
        userId: dto.userId,
        statsId,
        totalTasksCompleted: metrics.totalTasksCompleted,
        performanceScore: inputs.performanceScore,
      }
    })
  }
}
