import db from '@adonisjs/lucid/services/db'

export interface TaskAuditTargetLabel {
  id: string
  title: string
}

const toSearchPattern = (value: string): string => {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[%_]/g, '\\$&')
  return `%${escaped}%`
}

export async function listTaskAuditTargetIdsByOrganization(
  organizationId: string
): Promise<string[]> {
  const rows = (await db
    .from('tasks')
    .where('organization_id', organizationId)
    .select('id')) as Array<{ id: string }>

  return rows.map((row) => row.id)
}

export async function searchTaskAuditTargetIds(
  organizationId: string,
  search: string
): Promise<string[]> {
  const rows = (await db
    .from('tasks')
    .where('organization_id', organizationId)
    .whereRaw("title ilike ? escape '\\'", [toSearchPattern(search)])
    .select('id')) as Array<{ id: string }>

  return rows.map((row) => row.id)
}

export async function listTaskAuditTargetLabels(
  ids: string[],
  organizationId?: string
): Promise<TaskAuditTargetLabel[]> {
  if (ids.length === 0) return []

  let query = db.from('tasks').whereIn('id', ids)
  if (organizationId) query = query.where('organization_id', organizationId)

  return (await query.select('id', 'title')) as TaskAuditTargetLabel[]
}
