import type { ComposedUserIdentityReader } from '#composition/adapters/auth/identity/composed_user_identity_reader'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import type {
  CacheInvalidationOperatorPermissionReader,
  CacheInvalidationOperatorPrincipal,
  CacheInvalidationOperatorPrincipalReader,
} from '#modules/cache/actions/ports/outbound/invalidation-outbox/cache_invalidation_operator_authorization_port'

export class CacheInvalidationOperatorAuthorizationAdapter
  implements CacheInvalidationOperatorPrincipalReader, CacheInvalidationOperatorPermissionReader
{
  constructor(private readonly users: ComposedUserIdentityReader) {}

  async findPrincipal(actorId: string): Promise<CacheInvalidationOperatorPrincipal | null> {
    const identity = await this.users.findSessionIdentity(actorId)
    if (!identity || identity.deleted_at !== null) {
      return null
    }
    return {
      id: identity.id,
      systemRole: identity.system_role,
      status: identity.status,
    }
  }

  canManageSystemSettings(systemRole: string): Promise<boolean> {
    return hasSystemPermission(systemRole, 'can_manage_system_settings')
  }
}
