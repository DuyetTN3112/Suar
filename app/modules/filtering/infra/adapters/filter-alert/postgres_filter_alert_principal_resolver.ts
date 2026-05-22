import db from '@adonisjs/lucid/services/db'

import type { FilterAlertPrincipalResolver } from '#modules/filtering/actions/ports/outbound/filter_alert_principal_resolver'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

export class PostgresFilterAlertPrincipalResolver implements FilterAlertPrincipalResolver {
  async resolve(input: Parameters<FilterAlertPrincipalResolver['resolve']>[0]): Promise<FilterPrincipal | null> {
    const organizationId = input.record.view.organizationId
    if (organizationId === null) return { kind: 'user', id: input.alert.ownerId }
    const membership = (await db
      .from('organization_users')
      .select('org_role')
      .where('organization_id', organizationId)
      .where('user_id', input.alert.ownerId)
      .where('status', 'approved')
      .first()) as { org_role?: unknown } | undefined
    if (membership === undefined || typeof membership.org_role !== 'string') return null
    return { kind: 'user', id: input.alert.ownerId, organizationId, organizationRole: membership.org_role }
  }
}
