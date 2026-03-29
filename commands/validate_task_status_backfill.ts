import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

/**
 * Validate task status migration readiness.
 *
 * Reports data quality before hard-cut legacy `tasks.status`.
 *
 * Usage:
 *   node ace scheduler:validate-task-status-backfill
 *   node ace scheduler:validate-task-status-backfill --organization-id=<uuid>
 */
export default class ValidateTaskStatusBackfill extends BaseCommand {
  static override commandName = 'scheduler:validate-task-status-backfill'
  static override description = 'Validate task_status_id migration quality and report mismatches'

  static override options: CommandOptions = {
    startApp: true,
  }

  declare organizationIdFilter: string | null

  override prepare() {
    const parsed = this.parsed as { flags?: Record<string, unknown> }
    const flags = parsed.flags ?? {}
    this.organizationIdFilter = (flags['organization-id'] as string | undefined) ?? null
  }

  override async run() {
    const toCount = (value: unknown): number => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
      }
      return 0
    }

    const baseQuery = db.from('tasks as t').whereNull('t.deleted_at')

    if (this.organizationIdFilter) {
      void baseQuery.where('t.organization_id', this.organizationIdFilter)
      this.logger.info(`Scope: organization_id = ${this.organizationIdFilter}`)
    } else {
      this.logger.info('Scope: all organizations')
    }

    const totalResult = (await baseQuery.clone().count('* as total').first()) as {
      total?: number | string
    } | null
    const total = toCount(totalResult?.total)

    const missingStatusIdResult = (await baseQuery
      .clone()
      .whereNull('t.task_status_id')
      .count('* as total')
      .first()) as { total?: number | string } | null
    const missingStatusId = toCount(missingStatusIdResult?.total)

    const orphanStatusIdResult = (await baseQuery
      .clone()
      .leftJoin('task_statuses as ts', 'ts.id', 't.task_status_id')
      .whereNotNull('t.task_status_id')
      .whereNull('ts.id')
      .count('* as total')
      .first()) as { total?: number | string } | null
    const orphanStatusId = toCount(orphanStatusIdResult?.total)

    const categoryMismatchResult = (await baseQuery
      .clone()
      .join('task_statuses as ts', 'ts.id', 't.task_status_id')
      .whereNotNull('t.status')
      .whereRaw('t.status <> ts.category')
      .count('* as total')
      .first()) as { total?: number | string } | null
    const categoryMismatch = toCount(categoryMismatchResult?.total)

    const byOrgRaw = (await baseQuery
      .clone()
      .leftJoin('task_statuses as ts', 'ts.id', 't.task_status_id')
      .select('t.organization_id')
      .count('* as total')
      .count('* FILTER (WHERE t.task_status_id IS NULL) as missing_status_id')
      .count('* FILTER (WHERE t.task_status_id IS NOT NULL AND ts.id IS NULL) as orphan_status_id')
      .count(
        '* FILTER (WHERE t.task_status_id IS NOT NULL AND ts.id IS NOT NULL AND t.status IS NOT NULL AND t.status <> ts.category) as category_mismatch'
      )
      .groupBy('t.organization_id')) as Array<{
      organization_id: string
      total: number | string
      missing_status_id: number | string
      orphan_status_id: number | string
      category_mismatch: number | string
    }>

    const problemOrgs = byOrgRaw.filter((row) => {
      const missing = toCount(row.missing_status_id)
      const orphan = toCount(row.orphan_status_id)
      const mismatch = toCount(row.category_mismatch)
      return missing > 0 || orphan > 0 || mismatch > 0
    })

    this.logger.info('--- Task Status Migration Report ---')
    this.logger.info(`Total tasks: ${total}`)
    this.logger.info(`Missing task_status_id: ${missingStatusId}`)
    this.logger.info(`Orphan task_status_id: ${orphanStatusId}`)
    this.logger.info(`Legacy/category mismatch: ${categoryMismatch}`)
    this.logger.info(`Organizations with issues: ${problemOrgs.length}`)

    if (problemOrgs.length > 0) {
      this.logger.info('Top organizations with issues:')
      for (const row of problemOrgs.slice(0, 20)) {
        this.logger.info(
          `- ${row.organization_id}: total=${row.total}, missing=${row.missing_status_id}, orphan=${row.orphan_status_id}, mismatch=${row.category_mismatch}`
        )
      }
    }

    if (missingStatusId === 0 && orphanStatusId === 0 && categoryMismatch === 0) {
      this.logger.success('Status migration readiness: PASS (safe for hard-cut preparation)')
      return
    }

    this.logger.error('Status migration readiness: FAIL (fix data mismatches before hard-cut)')
    this.exitCode = 1
  }
}
