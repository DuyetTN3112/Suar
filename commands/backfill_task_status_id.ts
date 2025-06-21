import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

/**
 * Backfill tasks.task_status_id from task_statuses and sync legacy tasks.status to category.
 *
 * Usage:
 *   node ace scheduler:backfill-task-status-id --dry-run
 *   node ace scheduler:backfill-task-status-id --organization-id=<uuid>
 *   node ace scheduler:backfill-task-status-id --organization-id=<uuid> --limit=500
 */
export default class BackfillTaskStatusId extends BaseCommand {
  static override commandName = 'scheduler:backfill-task-status-id'
  static override description = 'Backfill task_status_id and sync legacy task status category'

  static override options: CommandOptions = {
    startApp: true,
  }

  declare organizationIdFilter: string | null
  declare dryRun: boolean
  declare limit: number

  override prepare() {
    const parsed = this.parsed as { flags?: Record<string, unknown> }
    const flags = parsed.flags ?? {}

    this.organizationIdFilter = (flags['organization-id'] as string | undefined) ?? null
    this.dryRun = Boolean(flags['dry-run'])
    this.limit = Number(flags.limit ?? 0) || 0
  }

  override async run() {
    const isRecord = (value: unknown): value is Record<string, unknown> => {
      return typeof value === 'object' && value !== null
    }

    this.logger.info('Starting task status backfill...')
    this.logger.info(`Dry run: ${this.dryRun}`)
    if (this.organizationIdFilter) {
      this.logger.info(`Scope organization_id: ${this.organizationIdFilter}`)
    }

    const trx = await db.transaction()

    try {
      const filters: string[] = ['t.deleted_at IS NULL']
      const params: Array<string | number> = []

      if (this.organizationIdFilter) {
        filters.push('t.organization_id = ?')
        params.push(this.organizationIdFilter)
      }

      const whereSql = filters.join(' AND ')
      const limitSql = this.limit > 0 ? 'LIMIT ?' : ''
      if (this.limit > 0) {
        params.push(this.limit)
      }

      const previewSql = `
        SELECT
          t.id,
          t.organization_id,
          t.status as legacy_status,
          t.task_status_id,
          ts.id as mapped_status_id,
          ts.slug as mapped_slug,
          ts.category as mapped_category
        FROM tasks t
        LEFT JOIN task_statuses ts
          ON ts.organization_id = t.organization_id
         AND ts.deleted_at IS NULL
         AND (
           ts.slug = t.status
           OR ts.category = t.status
         )
        WHERE ${whereSql}
          AND t.task_status_id IS NULL
        ORDER BY t.created_at ASC
        ${limitSql}
      `

      const previewQueryResult: unknown = await trx.rawQuery(previewSql, params)
      const rows =
        isRecord(previewQueryResult) && Array.isArray(previewQueryResult.rows)
          ? previewQueryResult.rows
          : []

      const preview = rows as Array<{
        id: string
        organization_id: string
        legacy_status: string | null
        task_status_id: string | null
        mapped_status_id: string | null
        mapped_slug: string | null
        mapped_category: string | null
      }>

      const mappable = preview.filter((row) => row.mapped_status_id)
      const unmappable = preview.filter((row) => !row.mapped_status_id)

      this.logger.info(`Candidates (task_status_id IS NULL): ${preview.length}`)
      this.logger.info(`Mappable: ${mappable.length}`)
      this.logger.info(`Unmappable: ${unmappable.length}`)

      if (unmappable.length > 0) {
        this.logger.info('Top unmappable rows:')
        for (const row of unmappable.slice(0, 20)) {
          this.logger.info(
            `- task=${row.id}, org=${row.organization_id}, legacy_status=${row.legacy_status ?? 'null'}`
          )
        }
      }

      if (this.dryRun) {
        await trx.rollback()
        this.logger.success('Dry-run complete. No data was modified.')
        return
      }

      const updateSql = `
        WITH candidates AS (
          SELECT
            t.id,
            ts.id as mapped_status_id,
            ts.category as mapped_category
          FROM tasks t
          JOIN task_statuses ts
            ON ts.organization_id = t.organization_id
           AND ts.deleted_at IS NULL
           AND (
             ts.slug = t.status
             OR ts.category = t.status
           )
          WHERE ${whereSql}
            AND t.task_status_id IS NULL
          ORDER BY t.created_at ASC
          ${limitSql}
        )
        UPDATE tasks t
           SET task_status_id = c.mapped_status_id,
               status = c.mapped_category,
               updated_at = NOW()
          FROM candidates c
         WHERE t.id = c.id
      `

      await trx.rawQuery(updateSql, params)
      await trx.commit()

      this.logger.success(`Backfill complete. Updated rows: ${mappable.length}`)
      if (unmappable.length > 0) {
        this.logger.error(
          `There are still ${unmappable.length} unmappable rows. Fix them before hard-cut.`
        )
        this.exitCode = 1
      }
    } catch (error) {
      await trx.rollback()
      this.logger.error(error instanceof Error ? error.message : String(error))
      this.exitCode = 1
    }
  }
}
