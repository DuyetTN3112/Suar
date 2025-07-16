import { BaseCommand } from '#actions/shared/base_command'
import UserRepository from '#infra/users/repositories/user_repository'
import UserPerformanceStatRepository from '#infra/users/repositories/user_performance_stat_repository'
import ReviewMetricsRepository from '#infra/reviews/repositories/review_metrics_repository'
import type { DatabaseId } from '#types/database'
import { DateTime } from 'luxon'
import { calculatePerformanceScore } from '#domain/reviews/review_formulas'

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

  async handle(dto: CalculatePerformanceScoreDTO): Promise<PerformanceScoreResult> {
    return await this.executeInTransaction(async (trx) => {
      const assignmentRows = (await ReviewMetricsRepository.listCompletedAssignmentsForPerformance(
        dto.userId,
        trx
      )) as Array<{
        id: string
        completed_at: string | Date | null
        actual_hours: number | string | null
        due_date: string | Date | null
        difficulty: string | null
      }>

      const totalCompletedAssignments = assignmentRows.length
      const totalHoursWorked = assignmentRows.reduce((sum, item) => {
        const value = Number(item.actual_hours ?? 0)
        return sum + (Number.isFinite(value) ? value : 0)
      }, 0)

      // Delivery score: on-time rate in percentage.
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

        if (
          completedAt.isValid &&
          dueDate.isValid &&
          completedAt.toMillis() <= dueDate.toMillis()
        ) {
          onTimeCount += 1
        }
      }

      const deliveryScore =
        totalCompletedAssignments > 0 ? (onTimeCount / totalCompletedAssignments) * 100 : 0

      // Difficulty bonus normalized to 0-100 using max weight 4.0.
      const difficultyBonus =
        totalCompletedAssignments > 0
          ? (weightedDifficultyTotal / totalCompletedAssignments / 4.0) * 100
          : 0

      // Quality + consistency from manager overall quality on completed sessions.
      const qualityRows = (await ReviewMetricsRepository.listCompletedSessionQualityRows(
        dto.userId,
        trx
      )) as Array<{ overall_quality_score: number | string }>

      const qualityValues = qualityRows
        .map((row) => Number(row.overall_quality_score))
        .filter((v) => Number.isFinite(v) && v >= 1 && v <= 5)

      const qualityScore =
        qualityValues.length > 0
          ? (qualityValues.reduce((sum, value) => sum + value, 0) / qualityValues.length / 5) * 100
          : 0

      const qualityMean =
        qualityValues.length > 0
          ? qualityValues.reduce((sum, value) => sum + value, 0) / qualityValues.length
          : 0

      const qualityVariance =
        qualityValues.length > 0
          ? qualityValues.reduce((sum, value) => sum + (value - qualityMean) ** 2, 0) /
            qualityValues.length
          : 0

      const qualityStddev = Math.sqrt(qualityVariance)
      const consistencyScore = Math.max(0, 100 - qualityStddev * 25)

      const performanceScore = calculatePerformanceScore({
        qualityScore,
        deliveryScore,
        difficultyBonus,
        consistencyScore,
      })

      const user = await UserRepository.findNotDeletedOrFail(dto.userId, trx)
      const currentTrustData = user.trust_data ?? {
        current_tier_code: null,
        calculated_score: 0,
        raw_score: 0,
        total_verified_reviews: 0,
        last_calculated_at: null,
      }

      user.trust_data = {
        ...currentTrustData,
        scoring_version: CalculatePerformanceScoreCommand.PERFORMANCE_SCORING_VERSION,
        performance_score: performanceScore,
        performance_breakdown: {
          quality_score: Math.round(qualityScore * 10) / 10,
          delivery_score: Math.round(deliveryScore * 10) / 10,
          difficulty_bonus: Math.round(difficultyBonus * 10) / 10,
          consistency_score: Math.round(consistencyScore * 10) / 10,
          calculated_at: DateTime.now().toISO(),
        },
      }

      await UserRepository.save(user, trx)

      const latestStats = await UserPerformanceStatRepository.findLatestLifetimeByUser(
        dto.userId,
        trx
      )

      const payload = {
        user_id: dto.userId,
        period_start: null,
        period_end: null,
        total_tasks_completed: totalCompletedAssignments,
        total_hours_worked: Math.round(totalHoursWorked * 100) / 100,
        avg_quality_score: Math.round(qualityMean * 100) / 100,
        on_time_delivery_rate: Math.round(deliveryScore * 100) / 100,
        avg_days_early_or_late: null,
        performance_score: performanceScore,
        tasks_by_type: latestStats?.tasks_by_type ?? {},
        tasks_by_difficulty: latestStats?.tasks_by_difficulty ?? {},
        tasks_by_domain: latestStats?.tasks_by_domain ?? {},
        tasks_as_lead: latestStats?.tasks_as_lead ?? 0,
        tasks_as_sole_contributor: latestStats?.tasks_as_sole_contributor ?? 0,
        tasks_mentoring_others: latestStats?.tasks_mentoring_others ?? 0,
        longest_on_time_streak: latestStats?.longest_on_time_streak ?? 0,
        current_on_time_streak: latestStats?.current_on_time_streak ?? 0,
        self_assessment_accuracy: latestStats?.self_assessment_accuracy ?? null,
        calculated_at: DateTime.now(),
      }

      if (latestStats) {
        latestStats.merge(payload)
        await UserPerformanceStatRepository.save(latestStats, trx)
      } else {
        await UserPerformanceStatRepository.create(payload, trx)
      }

      await this.logAudit('calculate_performance_score', 'user', dto.userId, null, {
        performance_score: performanceScore,
        quality_score: Math.round(qualityScore * 10) / 10,
        delivery_score: Math.round(deliveryScore * 10) / 10,
        difficulty_bonus: Math.round(difficultyBonus * 10) / 10,
        consistency_score: Math.round(consistencyScore * 10) / 10,
        total_completed_assignments: totalCompletedAssignments,
        scoring_version: CalculatePerformanceScoreCommand.PERFORMANCE_SCORING_VERSION,
      })

      return {
        userId: dto.userId,
        performanceScore,
        qualityScore: Math.round(qualityScore * 10) / 10,
        deliveryScore: Math.round(deliveryScore * 10) / 10,
        difficultyBonus: Math.round(difficultyBonus * 10) / 10,
        consistencyScore: Math.round(consistencyScore * 10) / 10,
      }
    })
  }
}
