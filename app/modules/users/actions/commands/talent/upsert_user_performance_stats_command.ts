import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { TransactionalAuditOptions } from '#modules/users/actions/dtos/transactional_audit'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserSelfAssessmentAccuracyFactReader } from '#modules/users/actions/ports/outbound/user_self_assessment_accuracy_fact_reader'
import type {
  UserTransaction,
  UserTransactionRunner,
} from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import {
  calculatePerformanceAggregateMetrics,
  type PerformanceAggregateMetrics,
  type PerformanceAggregateRow,
  type SelfAssessmentAccuracyRow,
} from '#modules/users/domain/profile/profile_aggregate_rules'

export interface UpsertUserPerformanceStatsDTO {
  userId: string
  periodStart?: string | null
  periodEnd?: string | null
}

export interface UpsertUserPerformanceStatsResult {
  userId: string
  statsId: string
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
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly users: UserAccountRepository,
    private readonly profiles: UserProfileRepository,
    private readonly selfAssessmentAccuracyFactReader: UserSelfAssessmentAccuracyFactReader
  ) {
    super(execCtx, transactions)
  }

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

  private async loadPerformanceInputs(
    userId: string,
    period: ResolvedPeriod,
    trx: UserTransaction
  ): Promise<LoadedPerformanceInputs> {
    const historyRows = (await this.profiles.listPerformanceHistoryRows(
      userId,
      {
        periodStartSql: period.periodStartSql,
        periodEndSql: period.periodEndSql,
      },
      trx
    )) as unknown as HistoryRow[]

    const selfAssessmentFacts =
      await this.selfAssessmentAccuracyFactReader.listSelfAssessmentAccuracyFacts(
        userId,
        {
          periodStart: period.periodStart?.toISO() ?? null,
          periodEnd: period.periodEnd?.toISO() ?? null,
        },
        trx
      )

    const user = await this.users.findNotDeletedOrFail(userId, trx)

    return {
      historyRows: this.mapHistoryRows(historyRows),
      selfAssessmentRows: selfAssessmentFacts.map(
        (fact): SelfAssessmentAccuracyRow => ({
          selfScore: fact.selfScore,
          reviewedScore: fact.reviewedScore,
        })
      ),
      performanceScore: user.trust_data?.performance_score ?? null,
    }
  }

  private buildPerformancePayload(
    userId: string,
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
    userId: string,
    period: ResolvedPeriod,
    payload: ReturnType<UpsertUserPerformanceStatsCommand['buildPerformancePayload']>,
    trx: UserTransaction
  ): Promise<string> {
    const existing = await this.profiles.findPerformanceStat(
      userId,
      period.periodStartSql,
      period.periodEndSql,
      trx
    )

    if (existing) {
      await this.profiles.updatePerformanceStat(existing.id, payload, trx)
      return existing.id
    }

    const created = await this.profiles.createPerformanceStat(payload, trx)
    return created.id
  }

  private async logUpsertAudit(
    userId: string,
    period: ResolvedPeriod,
    statsId: string,
    metrics: PerformanceAggregateMetrics,
    performanceScore: number | null,
    trx: UserTransaction
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: this.execCtx.userId,
          action: 'upsert_user_performance_stats',
          critical: true,
          entity_type: 'user_performance_stats',
          entity_id: userId,
          old_values: null,
          new_values: {
            stats_id: statsId,
            period_start: period.periodStart?.toISO() ?? null,
            period_end: period.periodEnd?.toISO() ?? null,
            total_tasks_completed: metrics.totalTasksCompleted,
            performance_score: performanceScore,
          },
        },
        trx
      )
    }
  }

  async handle(dto: UpsertUserPerformanceStatsDTO): Promise<UpsertUserPerformanceStatsResult> {
    return await this.executeInTransaction((trx) => this.handleInTransaction(dto, trx))
  }

  async handleInTransaction(
    dto: UpsertUserPerformanceStatsDTO,
    trx: UserTransaction,
    auditOptions: TransactionalAuditOptions = {}
  ): Promise<UpsertUserPerformanceStatsResult> {
    const resolvedPeriod = this.resolvePeriod(dto)
    const inputs = await this.loadPerformanceInputs(dto.userId, resolvedPeriod, trx)
    const metrics = calculatePerformanceAggregateMetrics({
      rows: inputs.historyRows,
      selfAssessmentRows: inputs.selfAssessmentRows,
    })
    const payload = this.buildPerformancePayload(
      dto.userId,
      resolvedPeriod,
      metrics,
      inputs.performanceScore
    )
    const statsId = await this.persistPerformanceStats(
      dto.userId,
      resolvedPeriod,
      payload,
      trx
    )
    const auditWrite = () =>
      this.logUpsertAudit(
        dto.userId,
        resolvedPeriod,
        statsId,
        metrics,
        inputs.performanceScore,
        trx
      )
    if (auditOptions.deferAuditWrite) {
      auditOptions.deferAuditWrite(auditWrite)
    } else {
      await auditWrite()
    }

    return {
      userId: dto.userId,
      statsId,
      totalTasksCompleted: metrics.totalTasksCompleted,
      performanceScore: inputs.performanceScore,
    }
  }
}
