import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

/**
 * Validate Database Consistency
 *
 * Replaces MySQL: validate_database_consistency() stored procedure
 * Cron: 0 5 * * 1 (every Monday at 05:00 UTC)
 *
 * Checks:
 * 1. Every user has user_details (1:1 required)
 * 2. Every organization has at least one owner
 * 3. Every project owner belongs to the project's organization
 * 4. No orphaned task assignments (checked by cleanup_orphans too)
 * 5. No duplicate role assignments (org_users, project_members)
 * 6. Every task belongs to a valid project in a valid organization
 *
 * Usage:
 *   node ace db:validate-consistency
 *   node ace db:validate-consistency --verbose
 */
export default class ValidateDatabaseConsistency extends BaseCommand {
  static override commandName = 'db:validate-consistency'
  static override description = 'Validate database referential integrity and business rules'

  static override options: CommandOptions = {
    startApp: true,
  }

  declare verbose: boolean

  private errors: ValidationResult[] = []
  private warnings: ValidationResult[] = []

  override async prepare() {
    this.verbose = Boolean(this.parsed.flags?.verbose)
  }

  override async run() {
    this.logger.info('═══════════════════════════════════════════')
    this.logger.info('  Database Consistency Validation')
    this.logger.info('═══════════════════════════════════════════')

    await this.checkUserDetails()
    await this.checkOrganizationOwners()
    await this.checkProjectOwnerMembership()
    await this.checkOrphanedTaskAssignments()
    await this.checkDuplicateRoleAssignments()
    await this.checkTaskProjectOrganizationChain()
    await this.checkInvalidStatusReferences()

    this.logger.info('')
    this.logger.info('───────────────────────────────────────────')

    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.logger.success('✅ SUCCESS: Database consistency validation passed')
    } else {
      if (this.errors.length > 0) {
        this.logger.error(`❌ ERRORS: ${this.errors.length}`)
        for (const err of this.errors) {
          this.logger.error(`   • ${err.check}: ${err.count} issues — ${err.message}`)
        }
      }
      if (this.warnings.length > 0) {
        this.logger.warning(`⚠  WARNINGS: ${this.warnings.length}`)
        for (const warn of this.warnings) {
          this.logger.warning(`   • ${warn.check}: ${warn.count} issues — ${warn.message}`)
        }
      }
      if (this.errors.length > 0) {
        this.exitCode = 1
      }
    }
  }

  /**
   * Check 1: Every active user must have a user_details record
   */
  private async checkUserDetails() {
    const label = 'users → user_details'

    const result = await db.rawQuery(`
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN user_details ud ON u.id = ud.user_id
      WHERE u.deleted_at IS NULL AND ud.user_id IS NULL
    `)

    const count = Number(result.rows?.[0]?.total ?? 0)

    if (count > 0) {
      this.errors.push({
        check: label,
        count,
        message: `${count} active users missing user_details`,
      })
      this.logger.error(`  ✗ ${label}: ${count} users missing user_details`)

      if (this.verbose) {
        const missing = await db.rawQuery(`
          SELECT u.id, u.username, u.email
          FROM users u
          LEFT JOIN user_details ud ON u.id = ud.user_id
          WHERE u.deleted_at IS NULL AND ud.user_id IS NULL
          LIMIT 10
        `)
        for (const row of missing.rows ?? []) {
          this.logger.error(`      → User ${row.id} (${row.username} / ${row.email})`)
        }
      }
    } else {
      this.logger.info('  ✓ All active users have user_details')
    }
  }

  /**
   * Check 2: Every active organization must have at least one owner
   */
  private async checkOrganizationOwners() {
    const label = 'organizations → owner'

    const result = await db.rawQuery(`
      SELECT COUNT(*) as total
      FROM organizations o
      WHERE o.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM organization_users ou
          JOIN organization_roles orole ON ou.role_id = orole.id
          WHERE ou.organization_id = o.id
            AND orole.name = 'org_owner'
            AND ou.status = 'approved'
        )
    `)

    const count = Number(result.rows?.[0]?.total ?? 0)

    if (count > 0) {
      this.errors.push({
        check: label,
        count,
        message: `${count} organizations without an approved owner`,
      })
      this.logger.error(`  ✗ ${label}: ${count} organizations without owner`)

      if (this.verbose) {
        const orgs = await db.rawQuery(`
          SELECT o.id, o.name, o.slug
          FROM organizations o
          WHERE o.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM organization_users ou
              JOIN organization_roles orole ON ou.role_id = orole.id
              WHERE ou.organization_id = o.id
                AND orole.name = 'org_owner'
                AND ou.status = 'approved'
            )
          LIMIT 10
        `)
        for (const row of orgs.rows ?? []) {
          this.logger.error(`      → Org ${row.id} (${row.name} / ${row.slug})`)
        }
      }
    } else {
      this.logger.info('  ✓ All organizations have at least one owner')
    }
  }

  /**
   * Check 3: Every project's owner must be a member of the project's organization
   */
  private async checkProjectOwnerMembership() {
    const label = 'projects → owner membership'

    const result = await db.rawQuery(`
      SELECT COUNT(*) as total
      FROM projects p
      WHERE p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM organization_users ou
          WHERE ou.organization_id = p.organization_id
            AND ou.user_id = p.owner_id
            AND ou.status = 'approved'
        )
    `)

    const count = Number(result.rows?.[0]?.total ?? 0)

    if (count > 0) {
      this.errors.push({
        check: label,
        count,
        message: `${count} projects with owners not in their organization`,
      })
      this.logger.error(`  ✗ ${label}: ${count} projects with invalid owners`)

      if (this.verbose) {
        const projects = await db.rawQuery(`
          SELECT p.id, p.name, p.owner_id, p.organization_id
          FROM projects p
          WHERE p.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM organization_users ou
              WHERE ou.organization_id = p.organization_id
                AND ou.user_id = p.owner_id
                AND ou.status = 'approved'
            )
          LIMIT 10
        `)
        for (const row of projects.rows ?? []) {
          this.logger.error(
            `      → Project ${row.id} (${row.name}): owner ${row.owner_id} not in org ${row.organization_id}`
          )
        }
      }
    } else {
      this.logger.info('  ✓ All project owners belong to their organization')
    }
  }

  /**
   * Check 4: No orphaned task assignments (task deleted but assignment remains)
   */
  private async checkOrphanedTaskAssignments() {
    const label = 'task_assignments → tasks'

    const result = await db.rawQuery(`
      SELECT COUNT(*) as total
      FROM task_assignments ta
      WHERE NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.id = ta.task_id AND t.deleted_at IS NULL
      )
    `)

    const count = Number(result.rows?.[0]?.total ?? 0)

    if (count > 0) {
      this.warnings.push({
        check: label,
        count,
        message: `${count} orphaned task assignments (run scheduler:cleanup-orphans --fix)`,
      })
      this.logger.warning(`  ⚠ ${label}: ${count} orphaned task assignments`)
    } else {
      this.logger.info('  ✓ No orphaned task assignments')
    }
  }

  /**
   * Check 5: No duplicate role assignments
   */
  private async checkDuplicateRoleAssignments() {
    const label = 'duplicate assignments'

    // Duplicate org memberships
    const orgDupes = await db.rawQuery(`
      SELECT organization_id, user_id, COUNT(*) as cnt
      FROM organization_users
      GROUP BY organization_id, user_id
      HAVING COUNT(*) > 1
    `)

    const orgDupeCount = orgDupes.rows?.length ?? 0

    // Duplicate project memberships
    const projDupes = await db.rawQuery(`
      SELECT project_id, user_id, COUNT(*) as cnt
      FROM project_members
      GROUP BY project_id, user_id
      HAVING COUNT(*) > 1
    `)

    const projDupeCount = projDupes.rows?.length ?? 0

    const total = orgDupeCount + projDupeCount

    if (total > 0) {
      this.warnings.push({
        check: label,
        count: total,
        message: `${orgDupeCount} duplicate org memberships, ${projDupeCount} duplicate project memberships`,
      })
      this.logger.warning(`  ⚠ ${label}: ${orgDupeCount} org dupes, ${projDupeCount} project dupes`)
    } else {
      this.logger.info('  ✓ No duplicate role assignments')
    }
  }

  /**
   * Check 6: Every task's project belongs to a valid organization
   */
  private async checkTaskProjectOrganizationChain() {
    const label = 'task → project → organization chain'

    const result = await db.rawQuery(`
      SELECT COUNT(*) as total
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN organizations o ON p.organization_id = o.id
      WHERE t.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND (o.id IS NULL OR o.deleted_at IS NOT NULL)
    `)

    const count = Number(result.rows?.[0]?.total ?? 0)

    if (count > 0) {
      this.errors.push({
        check: label,
        count,
        message: `${count} tasks belong to projects whose organization is deleted/missing`,
      })
      this.logger.error(`  ✗ ${label}: ${count} broken chains`)
    } else {
      this.logger.info('  ✓ All task → project → organization chains valid')
    }
  }

  /**
   * Check 7: No references to invalid status/role IDs in lookup tables
   */
  private async checkInvalidStatusReferences() {
    const label = 'status/role references'

    const checks = [
      { table: 'users', column: 'status_id', lookup: 'user_status' },
      { table: 'users', column: 'system_role_id', lookup: 'system_roles' },
      { table: 'tasks', column: 'status_id', lookup: 'task_status' },
      { table: 'tasks', column: 'priority_id', lookup: 'task_priorities' },
      { table: 'projects', column: 'status_id', lookup: 'project_status' },
    ]

    let totalInvalid = 0

    for (const check of checks) {
      const result = await db.rawQuery(`
        SELECT COUNT(*) as total
        FROM ${check.table} t
        LEFT JOIN ${check.lookup} l ON t.${check.column} = l.id
        WHERE t.deleted_at IS NULL AND l.id IS NULL
      `)

      const count = Number(result.rows?.[0]?.total ?? 0)
      if (count > 0) {
        totalInvalid += count
        if (this.verbose) {
          this.logger.warning(
            `  ⚠ ${check.table}.${check.column} → ${check.lookup}: ${count} invalid references`
          )
        }
      }
    }

    if (totalInvalid > 0) {
      this.warnings.push({
        check: label,
        count: totalInvalid,
        message: `${totalInvalid} references to non-existent status/role IDs`,
      })
      this.logger.warning(`  ⚠ ${label}: ${totalInvalid} invalid references`)
    } else {
      this.logger.info('  ✓ All status/role references valid')
    }
  }
}

interface ValidationResult {
  check: string
  count: number
  message: string
}
