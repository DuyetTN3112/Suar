import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { DefaultReviewDependencies } from '../ports/review_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/reviews/base_command'
import { calculatePerformanceScore } from '#domain/reviews/review_formulas'
import ReviewMetricsRepository from '#infra/reviews/repositories/review_metrics_repository'
import type { DatabaseId } from '#types/database'

export interface CalculatePerformanceScoreDTO {
  userId: DatabaseId
}

export interface PerformanceScoreResult {
  userId: DatabaseId
  performanceScore: number
  qualityScore: number
  deliveryScore: number
  difficultyBonus: number
  consistencyScore: number
}

interface AssignmentPerformanceRow {
  id: string
  completed_at: string | Date | null
  actual_hours: number | string | null
  due_date: string | Date | null
  difficulty: string | null
}

interface QualityPerformanceRow {
  overall_quality_score: number | string
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

  /**
   * Command flow:
   * 1. Load completion data from review metrics views.
   * 2. Derive aggregate performance signals.
   * 3. Persist compatibility data on users.trust_data.
   * 4. Upsert the source-of-truth user_performance_stats row.
   * 5. Emit audit trail and return the normalized result.
   */
  async handle(dto: CalculatePerformanceScoreDTO): Promise<PerformanceScoreResult> {
    return await this.executeInTransaction(async (trx) => {
      const { assignmentRows, qualityRows } = await this.loadPerformanceInputs(dto.userId, trx)
      const metrics = this.calculatePerformanceMetrics(assignmentRows, qualityRows)

      await this.persistUserTrustData(dto.userId, metrics, trx)
      await this.persistUserPerformanceStats(dto.userId, metrics, trx)
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'calculate_performance_score',
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
        })
      }

      return this.buildResult(dto.userId, metrics)
    })
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
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<{ assignmentRows: AssignmentPerformanceRow[]; qualityRows: QualityPerformanceRow[] }> {
    const assignmentRows = (await ReviewMetricsRepository.listCompletedAssignmentsForPerformance(
      userId,
      trx
    )) as AssignmentPerformanceRow[]

    const qualityRows = (await ReviewMetricsRepository.listCompletedSessionQualityRows(
      userId,
      trx
    )) as QualityPerformanceRow[]

    return { assignmentRows, qualityRows }
  }

  private calculatePerformanceMetrics(
    assignmentRows: AssignmentPerformanceRow[],
    qualityRows: QualityPerformanceRow[]
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

    const consistencyScore = Math.max(0, 100 - Math.sqrt(qualityVariance) * 25)
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
    userId: DatabaseId,
    metrics: PerformanceMetrics,
    trx: TransactionClientContract
  ): Promise<void> {
    const calculatedAt = DateTime.now().toISO()

    await DefaultReviewDependencies.user.mergeTrustData(
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
    userId: DatabaseId,
    metrics: PerformanceMetrics,
    trx: TransactionClientContract
  ): Promise<void> {
    await DefaultReviewDependencies.user.upsertLifetimePerformanceStats(
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

  private buildResult(userId: DatabaseId, metrics: PerformanceMetrics): PerformanceScoreResult {
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
