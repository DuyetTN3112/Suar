import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const existsValue = (value: unknown): boolean => {
  return value !== null && value !== undefined
}

/**
 * Custom VineJS Rules for Referential Integrity
 *
 * Since PostgreSQL schema has NO foreign keys, these rules
 * provide application-level referential integrity checks.
 *
 * Replaces: 86 FK constraints from MySQL schema
 *
 * Usage:
 *   import { existsInTable, notOrphan, databaseId } from '#validators/rules/database'
 *
 *   vine.object({
 *     organizationId: databaseId().existsIn('organizations'),
 *     statusId: databaseId().existsIn('task_status'),
 *     assigneeId: databaseId().existsIn('users').notDeleted(),
 *   })
 */

// ============================================================
// databaseId: UUID string validator for database IDs
// ============================================================

/**
 * A UUID-format database ID validator.
 * Validates that the value is a valid UUID string.
 *
 * Usage: databaseId() → vine.string().uuid()
 */
export function databaseId() {
  return vine.string().uuid()
}

/**
 * An optional UUID-format database ID validator.
 */
export function optionalDatabaseId() {
  return vine.string().uuid().optional()
}

// ============================================================
// existsInTable: Check that a record exists in the specified table
// ============================================================

/**
 * Check that a record with the given ID exists in the specified table.
 * Optionally check that it's not soft-deleted (deleted_at IS NULL).
 *
 * @param table - The table name to check
 * @param column - The column to match against (default: 'id')
 * @param options.softDelete - If true, also check deleted_at IS NULL (default: false)
 *
 * Usage in vine schemas:
 *   statusId: vine.string().uuid().exists('task_status')
 *   organizationId: vine.string().uuid().exists('organizations', { softDelete: true })
 */
export function existsRule(
  table: string,
  column: string = 'id',
  options: { softDelete?: boolean } = {}
) {
  return vine
    .string()
    .uuid()
    .exists(async (queryDb, value) => {
      const query = queryDb.from(table).where(column, value)

      if (options.softDelete) {
        void query.whereNull('deleted_at')
      }

      const row = (await query.select(column).first()) as unknown
      return existsValue(row)
    })
}

// ============================================================
// Standalone async check functions (for use in commands/services)
// ============================================================

/**
 * Check if a record exists in a table. For use outside of VineJS validators
 * (e.g., in commands, services, controllers).
 *
 * @returns true if record exists, false otherwise
 */
export async function existsInTable(
  table: string,
  id: string,
  options: { column?: string; softDelete?: boolean } = {}
): Promise<boolean> {
  const column = options.column ?? 'id'
  const query = db.from(table).where(column, id)

  if (options.softDelete) {
    void query.whereNull('deleted_at')
  }

  const row = (await query.select(column).first()) as unknown
  return existsValue(row)
}

/**
 * Check that a child record's parent exists.
 * Returns true if the parent exists (record is NOT orphaned).
 *
 * @param childTable - The child table
 * @param childId - The child record's ID
 * @param parentTable - The parent table to check
 * @param foreignKeyColumn - The column in child table that references parent
 * @param options.parentColumn - The column in parent table (default: 'id')
 * @param options.softDelete - Whether parent table uses soft deletes
 *
 * @returns true if parent exists, false if orphaned
 */
export async function notOrphan(
  childTable: string,
  childId: string,
  parentTable: string,
  foreignKeyColumn: string,
  options: { parentColumn?: string; softDelete?: boolean } = {}
): Promise<boolean> {
  const parentColumn = options.parentColumn ?? 'id'

  const childRaw = (await db
    .from(childTable)
    .where('id', childId)
    .select(foreignKeyColumn)
    .first()) as unknown

  if (!isRecord(childRaw)) return false // Child doesn't exist

  const parentId = childRaw[foreignKeyColumn]
  if (typeof parentId !== 'string' && typeof parentId !== 'number') {
    return false // FK missing or invalid
  }

  const parentQuery = db.from(parentTable).where(parentColumn, parentId)

  if (options.softDelete) {
    void parentQuery.whereNull('deleted_at')
  }

  const parent = (await parentQuery.select(parentColumn).first()) as unknown
  return existsValue(parent)
}

// ============================================================
// Pre-built validator fragments for common FK checks
// ============================================================

/** Validates organizationId exists in organizations (not soft-deleted) */
export const organizationIdRule = () =>
  vine
    .string()
    .uuid()
    .exists(async (queryDb, value) => {
      const row = (await queryDb
        .from('organizations')
        .where('id', value)
        .whereNull('deleted_at')
        .select('id')
        .first()) as unknown
      return existsValue(row)
    })

/** Validates userId exists in users (not soft-deleted) */
export const userIdRule = () =>
  vine
    .string()
    .uuid()
    .exists(async (queryDb, value) => {
      const row = (await queryDb
        .from('users')
        .where('id', value)
        .whereNull('deleted_at')
        .select('id')
        .first()) as unknown
      return existsValue(row)
    })

/** Validates projectId exists in projects (not soft-deleted) */
export const projectIdRule = () =>
  vine
    .string()
    .uuid()
    .exists(async (queryDb, value) => {
      const row = (await queryDb
        .from('projects')
        .where('id', value)
        .whereNull('deleted_at')
        .select('id')
        .first()) as unknown
      return existsValue(row)
    })

/** Validates taskId exists in tasks (not soft-deleted) */
export const taskIdRule = () =>
  vine
    .string()
    .uuid()
    .exists(async (queryDb, value) => {
      const row = (await queryDb
        .from('tasks')
        .where('id', value)
        .whereNull('deleted_at')
        .select('id')
        .first()) as unknown
      return existsValue(row)
    })
