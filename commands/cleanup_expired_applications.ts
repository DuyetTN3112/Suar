import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'

type ParsedCommand = {
  flags?: Record<string, unknown>
}

type CountRow = {
  total?: number | string
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

/**
 * Cleanup Expired Task Applications
 *
 * Replaces MySQL: event_cleanup_expired_invitations (daily 02:00)
 * Cron: 0 2 * * * (daily at 02:00 UTC)
 *
 * Marks task_applications as 'expired' when:
 * - application_status = 'pending'
 * - applied_at + 30 days < NOW() (configurable via --days flag)
 *
 * Usage:
 *   node ace scheduler:cleanup-expired-applications
 *   node ace scheduler:cleanup-expired-applications --days=14 --dry-run
 */
export default class CleanupExpiredApplications extends BaseCommand {
  static override commandName = 'scheduler:cleanup-expired-applications'
  static override description =
    'Mark expired task applications and cleanup stale invitation-type applications'

  static override options: CommandOptions = {
    startApp: true,
  }

  declare daysThreshold: number
  declare dryRun: boolean

  override prepare() {
    const parsed = this.parsed as ParsedCommand
    const flags = parsed.flags ?? {}
    const parsedThreshold = toNumberValue(flags.days)

    this.daysThreshold = parsedThreshold > 0 ? parsedThreshold : 30
    this.dryRun = Boolean(flags['dry-run'])
  }

  override async run() {
    this.logger.info('Starting cleanup of expired task applications...')
    this.logger.info(`Threshold: ${this.daysThreshold} days | Dry run: ${this.dryRun}`)

    const trx = await db.transaction()

    try {
      // 1. Mark pending applications as expired after threshold
      const expiredQuery = trx
        .from('task_applications')
        .where('application_status', 'pending')
        .whereRaw(`applied_at + INTERVAL '${this.daysThreshold} days' < NOW()`)

      if (this.dryRun) {
        const countResult = (await expiredQuery
          .clone()
          .count('* as total')
          .first()) as CountRow | null
        const total = toNumberValue(countResult?.total)
        this.logger.info(`[DRY RUN] Would expire ${total} pending applications`)
        await trx.rollback()
        return
      }

      const updatedRows = Number(
        await expiredQuery.update({
          application_status: 'expired',
        })
      )

      // 2. Also cleanup withdrawn applications older than 90 days (hard cleanup)
      const withdrawnCount = Number(
        await trx
          .from('task_applications')
          .where('application_status', 'withdrawn')
          .whereRaw(`applied_at + INTERVAL '90 days' < NOW()`)
          .delete()
      )

      await trx.commit()

      // 3. Log via audit event
      await emitter.emit('audit:log', {
        userId: null,
        action: 'auto_cleanup_expired_applications',
        entityType: 'task_applications',
        entityId: null,
        oldValues: null,
        newValues: {
          expired_count: updatedRows,
          withdrawn_deleted: withdrawnCount,
          threshold_days: this.daysThreshold,
          run_at: new Date().toISOString(),
        },
        ipAddress: 'system',
        userAgent: 'Ace Scheduler',
      })

      this.logger.success(
        `Expired ${updatedRows} pending applications | Deleted ${withdrawnCount} old withdrawn applications`
      )
    } catch (error) {
      await trx.rollback()
      this.logger.error('Cleanup failed:')
      this.logger.error(error instanceof Error ? error.message : String(error))
      this.exitCode = 1
    }
  }
}
