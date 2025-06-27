import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import type { DatabaseId } from '#types/database'
import UserRepository from '#infra/users/repositories/user_repository'
import UserPerformanceStatRepository from '#infra/users/repositories/user_performance_stat_repository'
import UserAnalyticsRepository from '#infra/users/repositories/user_analytics_repository'
import { calculatePerformanceAggregateMetrics } from '#domain/users/profile_aggregate_rules'

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

type HistoryRow = {
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

  async handle(dto: UpsertUserPerformanceStatsDTO): Promise<UpsertUserPerformanceStatsResult> {
    return await this.executeInTransaction(async (trx) => {
      const periodStart = this.normalizePeriod(dto.periodStart)
      const periodEnd = this.normalizePeriod(dto.periodEnd)
      const periodStartSql = periodStart?.toSQL()
      const periodEndSql = periodEnd?.toSQL()

      const historyRows = (await UserAnalyticsRepository.listWorkHistoryRows(
        dto.userId,
        { periodStartSql, periodEndSql },
        trx
      )) as HistoryRow[]

      const selfAssessmentRows = (await UserAnalyticsRepository.listSelfAssessmentAccuracyRows(
        dto.userId,
        { periodStartSql, periodEndSql },
        trx
      )) as Array<{ overall_satisfaction: number | string; overall_quality_score: number | string }>
      const metrics = calculatePerformanceAggregateMetrics({
        rows: historyRows.map((row) => ({
          taskType: row.task_type,
          difficulty: row.difficulty,
          businessDomain: row.business_domain,
          roleInTask: row.role_in_task,
          collaborationType: row.collaboration_type,
          actualHours: this.toNumber(row.actual_hours),
          overallQualityScore: this.toNumber(row.overall_quality_score),
          wasOnTime: row.was_on_time,
          daysEarlyOrLate: this.toNumber(row.days_early_or_late),
        })),
        selfAssessmentRows: selfAssessmentRows.map((row) => ({
          selfScore: this.toNumber(row.overall_satisfaction),
          reviewedScore: this.toNumber(row.overall_quality_score),
        })),
      })

      const user = await UserRepository.findNotDeletedOrFail(dto.userId, trx)
      const performanceScore = user.trust_data?.performance_score ?? null

      const payload = {
        user_id: dto.userId,
        period_start: periodStart,
        period_end: periodEnd,
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

      const existing = await UserPerformanceStatRepository.findByUserAndPeriod(
        dto.userId,
        periodStartSql ?? null,
        periodEndSql ?? null,
        trx
      )

      let statsId: DatabaseId
      if (existing) {
        existing.merge(payload)
        await UserPerformanceStatRepository.save(existing, trx)
        statsId = existing.id
      } else {
        const created = await UserPerformanceStatRepository.create(payload, trx)
        statsId = created.id
      }

      await this.logAudit(
        'upsert_user_performance_stats',
        'user_performance_stats',
        dto.userId,
        null,
        {
          stats_id: statsId,
          period_start: periodStart?.toISO() ?? null,
          period_end: periodEnd?.toISO() ?? null,
          total_tasks_completed: metrics.totalTasksCompleted,
          performance_score: performanceScore,
        }
      )

      return {
        userId: dto.userId,
        statsId,
        totalTasksCompleted: metrics.totalTasksCompleted,
        performanceScore,
      }
    })
  }
}
