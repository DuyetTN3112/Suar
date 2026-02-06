import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const existsValue = (value: unknown): boolean => value !== null && value !== undefined

export function databaseId() {
  return vine.string().uuid()
}

export function optionalDatabaseId() {
  return vine.string().uuid().optional()
}

export function existsRule(
  table: string,
  column = 'id',
  options: { softDelete?: boolean } = {}
) {
  return vine
    .string()
    .uuid()
    .exists(async (queryDb, value) => {
      const query = queryDb.from(table).where(column, value)
      if (options.softDelete) void query.whereNull('deleted_at')
      const row = (await query.select(column).first()) as unknown
      return existsValue(row)
    })
}

export async function existsInTable(
  table: string,
  id: string,
  options: { column?: string; softDelete?: boolean } = {}
): Promise<boolean> {
  const column = options.column ?? 'id'
  const query = db.from(table).where(column, id)
  if (options.softDelete) void query.whereNull('deleted_at')
  const row = (await query.select(column).first()) as unknown
  return existsValue(row)
}

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

  if (!isRecord(childRaw)) return false

  const parentId = childRaw[foreignKeyColumn]
  if (typeof parentId !== 'string' && typeof parentId !== 'number') return false

  const parentQuery = db.from(parentTable).where(parentColumn, parentId)
  if (options.softDelete) void parentQuery.whereNull('deleted_at')
  const parent = (await parentQuery.select(parentColumn).first()) as unknown
  return existsValue(parent)
}
