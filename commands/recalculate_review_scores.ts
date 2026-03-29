import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { ExecutionContext } from '#types/execution_context'
import RecalculateRevieweeSkillScoresCommand from '#actions/reviews/commands/recalculate_reviewee_skill_scores_command'
import CalculatePerformanceScoreCommand from '#actions/reviews/commands/calculate_performance_score_command'
import CalculateTrustScoreCommand from '#actions/reviews/commands/calculate_trust_score_command'
import RefreshUserProfileAggregatesCommand from '#actions/users/commands/refresh_user_profile_aggregates_command'

/**
 * Recalculate review-derived scores for reviewees.
 *
 * Pipeline per user:
 * 1) Recalculate skill scores
 * 2) Recalculate performance score
 * 3) Recalculate trust score
 * 4) Refresh profile aggregate tables
 *
 * Usage:
 *   node ace scheduler:recalculate-review-scores
 *   node ace scheduler:recalculate-review-scores --user-id=<uuid>
 *   node ace scheduler:recalculate-review-scores --limit=200
 */
export default class RecalculateReviewScores extends BaseCommand {
  static override commandName = 'scheduler:recalculate-review-scores'
  static override description = 'Recalculate skill/performance/trust scores from completed reviews'

  static override options: CommandOptions = {
    startApp: true,
  }

  declare userIdFilter: string | null
  declare limit: number

  override prepare() {
    const parsed = this.parsed as { flags?: Record<string, unknown> }
    const flags = parsed.flags ?? {}

    this.userIdFilter = (flags['user-id'] as string | undefined) ?? null
    this.limit = Number(flags.limit ?? 0) || 0
  }

  override async run() {
    this.logger.info('Starting review score recalculation...')

    const revieweesQuery = db
      .from('review_sessions')
      .where('status', 'completed')
      .distinct('reviewee_id')
      .orderBy('reviewee_id', 'asc')

    if (this.userIdFilter) {
      void revieweesQuery.where('reviewee_id', this.userIdFilter)
    }

    if (this.limit > 0) {
      void revieweesQuery.limit(this.limit)
    }

    const rows = (await revieweesQuery) as Array<{ reviewee_id: string }>
    const revieweeIds = rows.map((row) => row.reviewee_id)

    if (revieweeIds.length === 0) {
      this.logger.info('No reviewees found for recalculation.')
      return
    }

    this.logger.info(`Found ${revieweeIds.length} reviewees to process`)

    let success = 0
    let failed = 0

    for (const revieweeId of revieweeIds) {
      try {
        const execCtx = ExecutionContext.system(revieweeId)

        const recalculateSkills = new RecalculateRevieweeSkillScoresCommand(execCtx)
        const calculatePerformance = new CalculatePerformanceScoreCommand(execCtx)
        const calculateTrust = new CalculateTrustScoreCommand(execCtx)
        const refreshAggregates = new RefreshUserProfileAggregatesCommand(execCtx)

        await recalculateSkills.handle({ userId: revieweeId })
        await calculatePerformance.handle({ userId: revieweeId })
        await calculateTrust.handle({ userId: revieweeId })
        await refreshAggregates.handle({ userId: revieweeId })

        success += 1
      } catch (error) {
        failed += 1
        this.logger.error(
          `Failed recalculation for user ${revieweeId}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    this.logger.success(`Review score recalculation done: ${success} succeeded, ${failed} failed`)

    if (failed > 0) {
      this.exitCode = 1
    }
  }
}
