import db from '@adonisjs/lucid/services/db'

export interface ProjectAuditTargetLabel {
  id: string
  name: string
}

const toSearchPattern = (value: string): string => {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[%_]/g, '\\$&')
  return `%${escaped}%`
}

export async function listProjectAuditTargetIdsByOrganization(
  organizationId: string
): Promise<string[]> {
  const rows = (await db
    .from('projects')
    .where('organization_id', organizationId)
    .select('id')) as Array<{ id: string }>

  return rows.map((row) => row.id)
}

export async function searchProjectAuditTargetIds(
  organizationId: string,
  search: string
): Promise<string[]> {
  const rows = (await db
    .from('projects')
    .where('organization_id', organizationId)
    .whereRaw("name ilike ? escape '\\'", [toSearchPattern(search)])
    .select('id')) as Array<{ id: string }>

  return rows.map((row) => row.id)
}

export async function listProjectAuditTargetLabels(
  ids: string[],
  organizationId?: string
): Promise<ProjectAuditTargetLabel[]> {
  if (ids.length === 0) return []

  let query = db.from('projects').whereIn('id', ids)
  if (organizationId) query = query.where('organization_id', organizationId)

  return (await query.select('id', 'name')) as ProjectAuditTargetLabel[]
}
