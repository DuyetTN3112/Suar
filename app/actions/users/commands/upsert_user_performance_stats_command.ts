import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import type { DatabaseId } from '#types/database'
import UserRepository from '#infra/users/repositories/user_repository'
import UserPerformanceStatRepository from '#infra/users/repositories/user_performance_stat_repository'
import UserAnalyticsRepository from '#infra/users/repositories/user_analytics_repository'

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

  private incrementCounter(counter: Record<string, number>, key: string | null): void {
    if (!key) return
    counter[key] = (counter[key] ?? 0) + 1
  }

  private computeStreaks(rows: HistoryRow[]): { longest: number; current: number } {
    let longest = 0
    let current = 0

    for (const row of rows) {
      if (row.was_on_time === true) {
        current += 1
        longest = Math.max(longest, current)
      } else {
        current = 0
      }
    }

    return { longest, current }
  }

  private isLeadRole(role: string | null): boolean {
    if (!role) return false
    const normalized = role.toLowerCase()
    return normalized.includes('lead') || normalized.includes('owner')
  }

  private isMentoringRole(role: string | null): boolean {
    if (!role) return false
    const normalized = role.toLowerCase()
    return normalized.includes('mentor') || normalized.includes('coach')
  }

  private isSoleContributor(collaborationType: string | null): boolean {
    if (!collaborationType) return false
    const normalized = collaborationType.toLowerCase()
    return normalized.includes('solo') || normalized.includes('individual')
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

      const totalTasksCompleted = historyRows.length
      const totalHoursWorked = historyRows.reduce(
        (sum, row) => sum + (this.toNumber(row.actual_hours) ?? 0),
        0
      )

      const qualityValues = historyRows
        .map((row) => this.toNumber(row.overall_quality_score))
        .filter((value): value is number => typeof value === 'number')

      const avgQualityScore =
        qualityValues.length > 0
          ? Math.round(
              (qualityValues.reduce((sum, value) => sum + value, 0) / qualityValues.length) * 100
            ) / 100
          : null

      const onTimeRows = historyRows.filter((row) => row.was_on_time !== null)
      const onTimeCount = onTimeRows.filter((row) => row.was_on_time === true).length
      const onTimeDeliveryRate =
        onTimeRows.length > 0 ? Math.round((onTimeCount / onTimeRows.length) * 10000) / 100 : null

      const daysValues = historyRows
        .map((row) => this.toNumber(row.days_early_or_late))
        .filter((value): value is number => typeof value === 'number')

      const avgDaysEarlyOrLate =
        daysValues.length > 0
          ? Math.round(
              (daysValues.reduce((sum, value) => sum + value, 0) / daysValues.length) * 100
            ) / 100
          : null

      const tasksByType: Record<string, number> = {}
      const tasksByDifficulty: Record<string, number> = {}
      const tasksByDomain: Record<string, number> = {}

      let tasksAsLead = 0
      let tasksAsSoleContributor = 0
      let tasksMentoringOthers = 0

      for (const row of historyRows) {
        this.incrementCounter(tasksByType, row.task_type)
        this.incrementCounter(tasksByDifficulty, row.difficulty)
        this.incrementCounter(tasksByDomain, row.business_domain)

        if (this.isLeadRole(row.role_in_task)) tasksAsLead += 1
        if (this.isSoleContributor(row.collaboration_type)) tasksAsSoleContributor += 1
        if (this.isMentoringRole(row.role_in_task)) tasksMentoringOthers += 1
      }

      const { longest, current } = this.computeStreaks(historyRows)

      const selfAssessmentRows = (await UserAnalyticsRepository.listSelfAssessmentAccuracyRows(
        dto.userId,
        { periodStartSql, periodEndSql },
        trx
      )) as Array<{ overall_satisfaction: number | string; overall_quality_score: number | string }>

      const selfAssessmentDiffs = selfAssessmentRows
        .map((row) => {
          const selfScore = this.toNumber(row.overall_satisfaction)
          const reviewedScore = this.toNumber(row.overall_quality_score)

          if (selfScore === null || reviewedScore === null) return null
          return Math.abs(selfScore - reviewedScore)
        })
        .filter((value): value is number => typeof value === 'number')

      const selfAssessmentAccuracy =
        selfAssessmentDiffs.length > 0
          ? Math.max(
              0,
              Math.round(
                (100 -
                  (selfAssessmentDiffs.reduce((sum, value) => sum + value, 0) /
                    selfAssessmentDiffs.length /
                    4) *
                    100) *
                  100
              ) / 100
            )
          : null

      const user = await UserRepository.findNotDeletedOrFail(dto.userId, trx)
      const performanceScore = user.trust_data?.performance_score ?? null

      const payload = {
        user_id: dto.userId,
        period_start: periodStart,
        period_end: periodEnd,
        total_tasks_completed: totalTasksCompleted,
        total_hours_worked: Math.round(totalHoursWorked * 100) / 100,
        avg_quality_score: avgQualityScore,
        on_time_delivery_rate: onTimeDeliveryRate,
        avg_days_early_or_late: avgDaysEarlyOrLate,
        performance_score: performanceScore,
        tasks_by_type: tasksByType,
        tasks_by_difficulty: tasksByDifficulty,
        tasks_by_domain: tasksByDomain,
        tasks_as_lead: tasksAsLead,
        tasks_as_sole_contributor: tasksAsSoleContributor,
        tasks_mentoring_others: tasksMentoringOthers,
        longest_on_time_streak: longest,
        current_on_time_streak: current,
        self_assessment_accuracy: selfAssessmentAccuracy,
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
          total_tasks_completed: totalTasksCompleted,
          performance_score: performanceScore,
        }
      )

      return {
        userId: dto.userId,
        statsId,
        totalTasksCompleted,
        performanceScore,
      }
    })
  }
}
