import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'

type ParsedCommand = {
  flags?: Record<string, unknown>
}

type FreelancerRow = {
  user_id: string
}

type CompletedCountRow = {
  user_id: string
  completed_count?: number | string
}

type AvgRatingRow = {
  user_id: string
  avg_rating?: number | string | null
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const toNullableNumberValue = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = toNumberValue(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Recalculate Freelancer Stats
 *
 * Replaces MySQL: event_recalculate_freelancer_stats (weekly Saturday 03:00)
 * Replaces MySQL: calculate_freelancer_stats() stored procedure
 * Cron: 0 3 * * 6 (every Saturday at 03:00 UTC)
 *
 * Recalculates for each freelancer:
 * - freelancer_completed_tasks_count: COUNT of completed task_assignments
 * - freelancer_rating: AVG rating from skill_reviews received
 *
 * Usage:
 *   node ace scheduler:recalculate-freelancer-stats
 *   node ace scheduler:recalculate-freelancer-stats --dry-run
 *   node ace scheduler:recalculate-freelancer-stats --batch-size=50
 */
export default class RecalculateFreelancerStats extends BaseCommand {
  static override commandName = 'scheduler:recalculate-freelancer-stats'
  static override description = 'Recalculate completed tasks count and rating for all freelancers'

  static override options: CommandOptions = {
    startApp: true,
  }

  declare dryRun: boolean
  declare batchSize: number

  override prepare() {
    const parsed = this.parsed as ParsedCommand
    const flags = parsed.flags ?? {}
    const parsedBatchSize = toNumberValue(flags['batch-size'])

    this.dryRun = Boolean(flags['dry-run'])
    this.batchSize = parsedBatchSize > 0 ? parsedBatchSize : 100
  }

  override async run() {
    this.logger.info('Starting freelancer stats recalculation...')
    this.logger.info(`Batch size: ${this.batchSize} | Dry run: ${this.dryRun}`)

    try {
      // 1. Get all freelancer user IDs
      const freelancers = (await db
        .from('user_details')
        .where('is_freelancer', true)
        .select('user_id')) as FreelancerRow[]

      this.logger.info(`Found ${freelancers.length} freelancers to process`)

      if (freelancers.length === 0) {
        this.logger.info('No freelancers found. Exiting.')
        return
      }

      let processedCount = 0
      let errorCount = 0

      // 2. Process in batches
      for (let i = 0; i < freelancers.length; i += this.batchSize) {
        const batch = freelancers.slice(i, i + this.batchSize)
        const userIds = batch.map((f) => f.user_id)

        const trx = await db.transaction()

        try {
          // 2a. Completed tasks count per freelancer
          const completedCounts = (await trx
            .from('task_assignments as ta')
            .join('tasks as t', 't.id', 'ta.task_id')
            .join('task_status as ts', 'ts.id', 't.status_id')
            .whereIn('ta.assignee_id', userIds)
            .where('ts.name', 'completed')
            .whereNull('t.deleted_at')
            .groupBy('ta.assignee_id')
            .select('ta.assignee_id as user_id')
            .count('* as completed_count')) as CompletedCountRow[]

          // 2b. Average rating per freelancer (from reviews received)
          const avgRatings = (await trx
            .from('skill_reviews as sr')
            .whereIn('sr.reviewee_id', userIds)
            .groupBy('sr.reviewee_id')
            .select('sr.reviewee_id as user_id')
            .avg('sr.rating as avg_rating')) as AvgRatingRow[]

          // Build lookup maps
          const countMap = new Map<string, number>()
          for (const row of completedCounts) {
            countMap.set(row.user_id, toNumberValue(row.completed_count))
          }

          const ratingMap = new Map<string, number | null>()
          for (const row of avgRatings) {
            ratingMap.set(row.user_id, toNullableNumberValue(row.avg_rating))
          }

          if (this.dryRun) {
            for (const userId of userIds) {
              const count = countMap.get(userId) ?? 0
              const rating = ratingMap.get(userId) ?? null
              this.logger.info(
                `[DRY RUN] User ${userId}: completed=${count}, rating=${rating ?? 'null'}`
              )
            }
            await trx.rollback()
            processedCount += userIds.length
            continue
          }

          // 2c. Bulk update each freelancer
          for (const userId of userIds) {
            const count = countMap.get(userId) ?? 0
            const rating = ratingMap.get(userId) ?? null

            await trx
              .from('user_details')
              .where('user_id', userId)
              .update({
                freelancer_completed_tasks_count: count,
                freelancer_rating: rating !== null ? Math.round(rating * 100) / 100 : null,
              })
          }

          await trx.commit()
          processedCount += userIds.length
          this.logger.info(
            `Batch ${Math.floor(i / this.batchSize) + 1}: processed ${userIds.length} freelancers`
          )
        } catch (batchError) {
          await trx.rollback()
          errorCount += batch.length
          this.logger.error(
            `Batch ${Math.floor(i / this.batchSize) + 1} failed: ${batchError instanceof Error ? batchError.message : String(batchError)}`
          )
        }
      }

      // 3. Log via audit event
      if (!this.dryRun) {
        await emitter.emit('audit:log', {
          userId: null,
          action: 'auto_recalculate_freelancer_stats',
          entityType: 'user_details',
          entityId: null,
          oldValues: null,
          newValues: {
            total_freelancers: freelancers.length,
            processed: processedCount,
            errors: errorCount,
            run_at: new Date().toISOString(),
          },
          ipAddress: 'system',
          userAgent: 'Ace Scheduler',
        })
      }

      this.logger.success(
        `Recalculation complete: ${processedCount} processed, ${errorCount} errors`
      )
    } catch (error) {
      this.logger.error('Recalculation failed:')
      this.logger.error(error instanceof Error ? error.message : String(error))
      this.exitCode = 1
    }
  }
}
