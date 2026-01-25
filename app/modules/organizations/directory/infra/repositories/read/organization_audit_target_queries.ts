import db from '@adonisjs/lucid/services/db'

export interface OrganizationAuditTargetLabel {
  id: string
  name: string
}

const toSearchPattern = (value: string): string => {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[%_]/g, '\\$&')
  return `%${escaped}%`
}

export async function searchOrganizationAuditTargetIds(
  organizationId: string,
  search: string
): Promise<string[]> {
  const rows = (await db
    .from('organizations')
    .where('id', organizationId)
    .whereRaw("name ilike ? escape '\\'", [toSearchPattern(search)])
    .select('id')) as Array<{ id: string }>

  return rows.map((row) => row.id)
}

export async function listOrganizationAuditTargetLabels(
  ids: string[]
): Promise<OrganizationAuditTargetLabel[]> {
  if (ids.length === 0) return []

  return (await db
    .from('organizations')
    .whereIn('id', ids)
    .select('id', 'name')) as OrganizationAuditTargetLabel[]
}
