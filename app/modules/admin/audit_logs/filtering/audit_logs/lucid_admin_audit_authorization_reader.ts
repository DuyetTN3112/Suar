import db from '@adonisjs/lucid/services/db'

import type {
  AdminAuditAuthorizationReader,
  AdminAuditAuthorizationSnapshot,
} from '#modules/admin/audit_logs/filtering/audit_logs/admin_audit_permission_provider'
import { canAccessSystemAdministration } from '#modules/authorization/public_contracts/system_admin_access'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

const DENIED: AdminAuditAuthorizationSnapshot = {
  allowed: false,
  sessionActive: false,
  authorizationVersion: 'admin-audit-denied-v1',
}

/**
 * Re-reads the actor's current system role on every execution so a revoked
 * administrator loses access immediately instead of riding a stale session
 * snapshot (Filter Platform §11.4).
 */
export class LucidAdminAuditAuthorizationReader implements AdminAuditAuthorizationReader {
  async resolve(principal: FilterPrincipal): Promise<AdminAuditAuthorizationSnapshot> {
    if (principal.kind !== 'user' || typeof principal.id !== 'string') return DENIED

    const user = (await db.from('users').select('system_role').where('id', principal.id).first()) as
      | { system_role: string | null }
      | undefined
    if (!user || !user.system_role) return DENIED

    const decision = await canAccessSystemAdministration(user.system_role)
    if (!decision.allowed) return DENIED

    return {
      allowed: true,
      sessionActive: true,
      authorizationVersion: `admin-audit:${user.system_role}`,
    }
  }
}
