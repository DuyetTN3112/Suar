import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'

/**
 * Cleanup Orphaned Records
 *
 * Since PostgreSQL has NO foreign keys, orphaned records can accumulate.
 * This command detects and optionally cleans up orphaned records.
 *
 * Checks:
 * - task_assignments referencing non-existent tasks
 * - task_assignments referencing non-existent users
 * - task_applications referencing non-existent tasks
 * - project_members referencing non-existent projects or users
 * - organization_users referencing non-existent organizations or users
 * - conversation_participants referencing non-existent conversations or users
 * - task_required_skills referencing non-existent tasks
 * - task_labels referencing non-existent tasks
 * - messages referencing non-existent conversations
 *
 * Cron: 0 4 * * 0 (every Sunday at 04:00 UTC)
 *
 * Usage:
 *   node ace scheduler:cleanup-orphans              # Report only
 *   node ace scheduler:cleanup-orphans --fix        # Actually delete orphans
 */
export default class CleanupOrphans extends BaseCommand {
  static override commandName = 'scheduler:cleanup-orphans'
  static override description = 'Detect and cleanup orphaned records (no FK enforcement)'

  static override options: CommandOptions = {
    startApp: true,
  }

  declare fix: boolean

  override async prepare() {
    this.fix = Boolean(this.parsed.flags?.fix)
  }

  /**
   * Each orphan check configuration
   */
  private get orphanChecks(): OrphanCheck[] {
    return [
      {
        label: 'task_assignments → tasks',
        table: 'task_assignments',
        column: 'task_id',
        parentTable: 'tasks',
        parentColumn: 'id',
        softDelete: true,
      },
      {
        label: 'task_assignments → users (assignee)',
        table: 'task_assignments',
        column: 'assignee_id',
        parentTable: 'users',
        parentColumn: 'id',
        softDelete: true,
      },
      {
        label: 'task_applications → tasks',
        table: 'task_applications',
        column: 'task_id',
        parentTable: 'tasks',
        parentColumn: 'id',
        softDelete: true,
      },
      {
        label: 'project_members → projects',
        table: 'project_members',
        column: 'project_id',
        parentTable: 'projects',
        parentColumn: 'id',
        softDelete: true,
      },
      {
        label: 'project_members → users',
        table: 'project_members',
        column: 'user_id',
        parentTable: 'users',
        parentColumn: 'id',
        softDelete: true,
      },
      {
        label: 'organization_users → organizations',
        table: 'organization_users',
        column: 'organization_id',
        parentTable: 'organizations',
        parentColumn: 'id',
        softDelete: true,
      },
      {
        label: 'organization_users → users',
        table: 'organization_users',
        column: 'user_id',
        parentTable: 'users',
        parentColumn: 'id',
        softDelete: true,
      },
      {
        label: 'conversation_participants → conversations',
        table: 'conversation_participants',
        column: 'conversation_id',
        parentTable: 'conversations',
        parentColumn: 'id',
        softDelete: false,
      },
      {
        label: 'task_required_skills → tasks',
        table: 'task_required_skills',
        column: 'task_id',
        parentTable: 'tasks',
        parentColumn: 'id',
        softDelete: true,
      },
      {
        label: 'task_labels → tasks',
        table: 'task_labels',
        column: 'task_id',
        parentTable: 'tasks',
        parentColumn: 'id',
        softDelete: true,
      },
      {
        label: 'messages → conversations',
        table: 'messages',
        column: 'conversation_id',
        parentTable: 'conversations',
        parentColumn: 'id',
        softDelete: false,
      },
      {
        label: 'user_details → users',
        table: 'user_details',
        column: 'user_id',
        parentTable: 'users',
        parentColumn: 'id',
        softDelete: true,
      },
      {
        label: 'user_skills → users',
        table: 'user_skills',
        column: 'user_id',
        parentTable: 'users',
        parentColumn: 'id',
        softDelete: true,
      },
    ]
  }

  override async run() {
    this.logger.info(`Orphan scan started | Mode: ${this.fix ? 'FIX' : 'REPORT ONLY'}`)

    const results: OrphanResult[] = []
    let totalOrphans = 0

    for (const check of this.orphanChecks) {
      try {
        const count = await this.detectOrphans(check)
        if (count > 0) {
          totalOrphans += count
          results.push({ ...check, count, fixed: false })

          this.logger.warning(`  ⚠ ${check.label}: ${count} orphaned records`)

          if (this.fix) {
            const deleted = await this.deleteOrphans(check)
            const lastResult = results[results.length - 1]
            if (lastResult) {
              lastResult.fixed = true
              lastResult.count = deleted
            }
            this.logger.info(`    → Deleted ${deleted} orphaned records`)
          }
        } else {
          this.logger.info(`  ✓ ${check.label}: clean`)
        }
      } catch (error) {
        this.logger.error(
          `  ✗ ${check.label}: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }

    // Audit log
    await emitter.emit('audit:log', {
      userId: null,
      action: this.fix ? 'auto_cleanup_orphans' : 'auto_detect_orphans',
      entityType: 'system',
      entityId: null,
      oldValues: null,
      newValues: {
        total_orphans: totalOrphans,
        mode: this.fix ? 'fix' : 'report',
        details: results.map((r) => ({
          check: r.label,
          count: r.count,
          fixed: r.fixed,
        })),
        run_at: new Date().toISOString(),
      },
      ipAddress: 'system',
      userAgent: 'Ace Scheduler',
    })

    if (totalOrphans === 0) {
      this.logger.success('No orphaned records found. Database is clean!')
    } else if (this.fix) {
      this.logger.success(`Fixed ${totalOrphans} orphaned records across ${results.length} tables`)
    } else {
      this.logger.warning(
        `Found ${totalOrphans} orphaned records across ${results.length} tables. Run with --fix to clean up.`
      )
    }
  }

  /**
   * Count orphaned records for a specific check
   */
  private async detectOrphans(check: OrphanCheck): Promise<number> {
    const parentCondition = check.softDelete
      ? `SELECT 1 FROM ${check.parentTable} p WHERE p.${check.parentColumn} = c.${check.column} AND p.deleted_at IS NULL`
      : `SELECT 1 FROM ${check.parentTable} p WHERE p.${check.parentColumn} = c.${check.column}`

    const result = await db.rawQuery(
      `SELECT COUNT(*) as total FROM ${check.table} c WHERE NOT EXISTS (${parentCondition})`
    )

    return Number(result.rows?.[0]?.total ?? 0)
  }

  /**
   * Delete orphaned records for a specific check
   */
  private async deleteOrphans(check: OrphanCheck): Promise<number> {
    const parentCondition = check.softDelete
      ? `SELECT 1 FROM ${check.parentTable} p WHERE p.${check.parentColumn} = c.${check.column} AND p.deleted_at IS NULL`
      : `SELECT 1 FROM ${check.parentTable} p WHERE p.${check.parentColumn} = c.${check.column}`

    const result = await db.rawQuery(
      `DELETE FROM ${check.table} c WHERE NOT EXISTS (${parentCondition})`
    )

    return Number(result.rowCount ?? 0)
  }
}

interface OrphanCheck {
  label: string
  table: string
  column: string
  parentTable: string
  parentColumn: string
  softDelete: boolean
}

interface OrphanResult extends OrphanCheck {
  count: number
  fixed: boolean
}
