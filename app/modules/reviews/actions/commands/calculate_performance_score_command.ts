import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { TransactionalAuditDeferralOptions } from '#modules/reviews/actions/dtos/request/transactional_audit_options'
import type { ReviewUserReaderWriter } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type {
  ReviewMetricsReader,
  ReviewPerformanceAssignmentRow,
  ReviewPerformanceQualityRow,
} from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type {
  ReviewTransaction,
  ReviewTransactionRunner,
} from '#modules/reviews/actions/ports/outbound/review_transaction'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { calculatePerformanceScore } from '#modules/reviews/domain/review_formulas'

export interface CalculatePerformanceScoreDTO {
  userId: string
}

export interface PerformanceScoreResult {
  userId: string
  performanceScore: number
  qualityScore: number
  deliveryScore: number
  difficultyBonus: number
  consistencyScore: number
}

export interface CalculatePerformanceScoreTransactionOptions
  extends TransactionalAuditDeferralOptions {
  signal?: AbortSignal
}

interface PerformanceMetrics {
  totalCompletedAssignments: number
  totalHoursWorked: number
  qualityScore: number
  qualityMean: number
  deliveryScore: number
  difficultyBonus: number
  consistencyScore: number
  performanceScore: number
}

/**
 * CalculatePerformanceScoreCommand
 *
 * Computes execution performance score (0-100) from completed assignments +
 * completed review sessions and stores results in both:
 * - users.trust_data (compat)
 * - user_performance_stats (source-of-truth aggregate)
 */
export default class CalculatePerformanceScoreCommand extends BaseCommand<
  CalculatePerformanceScoreDTO,
  PerformanceScoreResult
> {
  private static readonly PERFORMANCE_SCORING_VERSION = 'performance_v1'

  constructor(
    execCtx: ReviewActionContext,
    private readonly userWriter: ReviewUserReaderWriter,
    private readonly metricsReader: ReviewMetricsReader,
    transactions?: ReviewTransactionRunner
  ) {
    super(execCtx, transactions)
  }

  /**
   * Command flow:
   * 1. Load completion data from review metrics views.
   * 2. Derive aggregate performance signals.
   * 3. Persist compatibility data on users.trust_data.
   * 4. Upsert the source-of-truth user_performance_stats row.
   * 5. Emit audit trail and return the normalized result.
   */
  async handle(dto: CalculatePerformanceScoreDTO): Promise<PerformanceScoreResult> {
    return await this.executeInTransaction((trx) => this.handleInTransaction(dto, trx))
  }

  async handleInTransaction(
    dto: CalculatePerformanceScoreDTO,
    trx: ReviewTransaction,
    options: CalculatePerformanceScoreTransactionOptions = {}
  ): Promise<PerformanceScoreResult> {
    options.signal?.throwIfAborted()

    const { assignmentRows, qualityRows } = await this.loadPerformanceInputs(dto.userId, trx)
    const metrics = this.calculatePerformanceMetrics(assignmentRows, qualityRows)

    await this.persistUserTrustData(dto.userId, metrics, trx)
    await this.persistUserPerformanceStats(dto.userId, metrics, trx)
    if (this.execCtx.userId) {
      const actorId = this.execCtx.userId
      const auditWrite = () =>
        auditPublicApi.write(
          this.execCtx,
          {
            user_id: actorId,
            action: 'calculate_performance_score',
            critical: true,
            entity_type: 'user',
            entity_id: dto.userId,
            old_values: null,
            new_values: {
              performance_score: metrics.performanceScore,
              quality_score: metrics.qualityScore,
              delivery_score: metrics.deliveryScore,
              difficulty_bonus: metrics.difficultyBonus,
              consistency_score: metrics.consistencyScore,
              total_completed_assignments: metrics.totalCompletedAssignments,
              scoring_version: CalculatePerformanceScoreCommand.PERFORMANCE_SCORING_VERSION,
            },
          },
          trx
        )
      if (options.deferAuditWrite) {
        options.deferAuditWrite(auditWrite)
      } else {
        await auditWrite()
      }
    }

    const result = this.buildResult(dto.userId, metrics)
    options.signal?.throwIfAborted()
    return result
  }

  private mapDifficultyWeight(difficulty: string | null): number {
    if (!difficulty) return 1.0

    switch (difficulty) {
      case 'expert':
        return 4.0
      case 'hard':
        return 2.5
      case 'medium':
        return 1.5
      case 'easy':
      default:
        return 1.0
    }
  }

  private async loadPerformanceInputs(
    userId: string,
    trx: ReviewTransaction
  ): Promise<{
    assignmentRows: ReviewPerformanceAssignmentRow[]
    qualityRows: ReviewPerformanceQualityRow[]
  }> {
    const assignmentRows = await this.metricsReader.listCompletedAssignmentsForPerformance(
      userId,
      trx
    )

    const qualityRows = await this.metricsReader.listCompletedSessionQualityRows(
      userId,
      trx
    )

    return { assignmentRows, qualityRows }
  }

  private calculatePerformanceMetrics(
    assignmentRows: ReviewPerformanceAssignmentRow[],
    qualityRows: ReviewPerformanceQualityRow[]
  ): PerformanceMetrics {
    const totalCompletedAssignments = assignmentRows.length
    const totalHoursWorked = assignmentRows.reduce((sum, item) => {
      const value = Number(item.actual_hours ?? 0)
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)

    let onTimeCount = 0
    let weightedDifficultyTotal = 0

    for (const assignment of assignmentRows) {
      weightedDifficultyTotal += this.mapDifficultyWeight(assignment.difficulty)

      if (!assignment.completed_at || !assignment.due_date) {
        continue
      }

      const completedAt =
        assignment.completed_at instanceof Date
          ? DateTime.fromJSDate(assignment.completed_at)
          : DateTime.fromISO(assignment.completed_at)

      const dueDate =
        assignment.due_date instanceof Date
          ? DateTime.fromJSDate(assignment.due_date)
          : DateTime.fromISO(assignment.due_date)

      if (completedAt.isValid && dueDate.isValid && completedAt.toMillis() <= dueDate.toMillis()) {
        onTimeCount += 1
      }
    }

    const deliveryScore =
      totalCompletedAssignments > 0 ? (onTimeCount / totalCompletedAssignments) * 100 : 0
    const difficultyBonus =
      totalCompletedAssignments > 0
        ? (weightedDifficultyTotal / totalCompletedAssignments / 4.0) * 100
        : 0

    const qualityValues = qualityRows
      .map((row) => Number(row.overall_quality_score))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5)

    const qualitySum = qualityValues.reduce((sum, value) => sum + value, 0)
    const qualityMean = qualityValues.length > 0 ? qualitySum / qualityValues.length : 0
    const qualityScore = qualityValues.length > 0 ? (qualityMean / 5) * 100 : 0

    const qualityVariance =
      qualityValues.length > 0
        ? qualityValues.reduce((sum, value) => sum + (value - qualityMean) ** 2, 0) /
          qualityValues.length
        : 0

    const consistencyScore =
      qualityValues.length > 0 ? Math.max(0, 100 - Math.sqrt(qualityVariance) * 25) : 0
    const performanceScore = calculatePerformanceScore({
      qualityScore,
      deliveryScore,
      difficultyBonus,
      consistencyScore,
    })

    return {
      totalCompletedAssignments,
      totalHoursWorked,
      qualityScore,
      qualityMean,
      deliveryScore,
      difficultyBonus,
      consistencyScore,
      performanceScore,
    }
  }

  private async persistUserTrustData(
    userId: string,
    metrics: PerformanceMetrics,
    trx: ReviewTransaction
  ): Promise<void> {
    const calculatedAt = DateTime.now().toISO()

    await this.userWriter.mergeTrustData(
      userId,
      {
        scoring_version: CalculatePerformanceScoreCommand.PERFORMANCE_SCORING_VERSION,
        performance_score: metrics.performanceScore,
        performance_breakdown: {
          quality_score: this.roundToTenth(metrics.qualityScore),
          delivery_score: this.roundToTenth(metrics.deliveryScore),
          difficulty_bonus: this.roundToTenth(metrics.difficultyBonus),
          consistency_score: this.roundToTenth(metrics.consistencyScore),
          calculated_at: calculatedAt,
        },
      },
      trx
    )
  }

  private async persistUserPerformanceStats(
    userId: string,
    metrics: PerformanceMetrics,
    trx: ReviewTransaction
  ): Promise<void> {
    await this.userWriter.upsertLifetimePerformanceStats(
      userId,
      {
        totalCompletedAssignments: metrics.totalCompletedAssignments,
        totalHoursWorked: metrics.totalHoursWorked,
        qualityMean: metrics.qualityMean,
        deliveryScore: metrics.deliveryScore,
        performanceScore: metrics.performanceScore,
        calculatedAt: DateTime.now(),
      },
      trx
    )
  }

  private buildResult(userId: string, metrics: PerformanceMetrics): PerformanceScoreResult {
    return {
      userId,
      performanceScore: metrics.performanceScore,
      qualityScore: this.roundToTenth(metrics.qualityScore),
      deliveryScore: this.roundToTenth(metrics.deliveryScore),
      difficultyBonus: this.roundToTenth(metrics.difficultyBonus),
      consistencyScore: this.roundToTenth(metrics.consistencyScore),
    }
  }

  private roundToTenth(value: number): number {
    return Math.round(value * 10) / 10
  }
}
